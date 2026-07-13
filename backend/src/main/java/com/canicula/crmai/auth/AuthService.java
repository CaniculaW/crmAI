package com.canicula.crmai.auth;

import com.canicula.crmai.audit.LoginLogEntry;
import com.canicula.crmai.audit.LoginLogService;
import jakarta.servlet.http.HttpServletRequest;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final JdbcTemplate jdbcTemplate;
    private final PasswordCredentialService passwordCredentialService;
    private final LoginLogService loginLogService;

    AuthService(
            JdbcTemplate jdbcTemplate,
            PasswordCredentialService passwordCredentialService,
            LoginLogService loginLogService) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordCredentialService = passwordCredentialService;
        this.loginLogService = loginLogService;
    }

    @Transactional
    public AuthTokenResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        LoginSubject subject = findLoginSubject(request.username())
                .orElseThrow(() -> {
                    loginLogService.record(loginFailure(null, request.username(), "bad_credentials", httpRequest));
                    return new UnauthorizedException("用户名或密码错误");
                });

        if (!"active".equals(subject.userStatus()) || !"active".equals(subject.loginAccountStatus())) {
            loginLogService.record(loginFailure(subject.userId(), request.username(), "account_disabled", httpRequest));
            throw new UnauthorizedException("账号不可用");
        }

        String passwordHash = findPasswordHash(subject.userId())
                .orElseThrow(() -> {
                    loginLogService.record(loginFailure(subject.userId(), request.username(), "credential_missing", httpRequest));
                    return new UnauthorizedException("用户名或密码错误");
                });
        if (!passwordCredentialService.matches(request.password(), passwordHash)) {
            jdbcTemplate.update(
                    """
                    update sys_login_accounts
                    set failed_login_count = failed_login_count + 1,
                        last_failed_login_at = current_timestamp,
                        updated_at = current_timestamp
                    where id = ?
                    """,
                    subject.loginAccountId());
            loginLogService.record(loginFailure(subject.userId(), request.username(), "bad_credentials", httpRequest));
            throw new UnauthorizedException("用户名或密码错误");
        }

        jdbcTemplate.update(
                "update sys_users set last_login_at = current_timestamp where id = ?",
                subject.userId());
        jdbcTemplate.update(
                """
                update sys_login_accounts
                set failed_login_count = 0,
                    last_failed_login_at = null,
                    updated_at = current_timestamp
                where id = ?
                """,
                subject.loginAccountId());

        String token = newSessionToken();
        jdbcTemplate.update(
                """
                insert into sys_sessions (
                    user_id, login_account_id, session_token_hash, ip_address, user_agent, expires_at
                )
                values (?, ?, ?, ?, ?, ?)
                """,
                subject.userId(),
                subject.loginAccountId(),
                sha256(token),
                ipAddress(httpRequest),
                userAgent(httpRequest),
                OffsetDateTime.now().plusHours(8));
        loginLogService.record(new LoginLogEntry(
                subject.userId(),
                request.username(),
                "login_success",
                true,
                null,
                ipAddress(httpRequest),
                userAgent(httpRequest),
                traceId(httpRequest)));

        return new AuthTokenResponse(token, "Bearer", currentUserById(subject.userId()));
    }

    public CurrentUserResponse currentUser(String accessToken) {
        Long userId = userIdFromActiveSession(accessToken);
        return currentUserById(userId);
    }

    public Long currentUserId(String accessToken) {
        return userIdFromActiveSession(accessToken);
    }

    @Transactional
    public void logout(String accessToken, HttpServletRequest request) {
        SessionSubject session = sessionSubject(accessToken)
                .orElseThrow(() -> new UnauthorizedException("登录状态已失效"));
        jdbcTemplate.update(
                "update sys_sessions set revoked_at = current_timestamp where id = ? and revoked_at is null",
                session.sessionId());
        loginLogService.record(new LoginLogEntry(
                session.userId(),
                null,
                "logout",
                true,
                null,
                ipAddress(request),
                userAgent(request),
                traceId(request)));
    }

    private CurrentUserResponse currentUserById(Long userId) {
        UserSummary user = jdbcTemplate.queryForObject(
                """
                select id, name, email
                from sys_users
                where id = ?
                  and status = 'active'
                  and deleted_at is null
                """,
                (rs, rowNum) -> new UserSummary(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getString("email")),
                userId);
        List<RoleSummary> roles = jdbcTemplate.query(
                """
                select r.id, r.code, r.name
                from sys_roles r
                join sys_user_roles ur on ur.role_id = r.id
                where ur.user_id = ?
                  and r.deleted_at is null
                order by r.code
                """,
                (rs, rowNum) -> new RoleSummary(
                        rs.getLong("id"),
                        rs.getString("code"),
                        rs.getString("name")),
                userId);
        List<String> permissions = jdbcTemplate.queryForList(
                """
                select distinct p.permission_code
                from sys_permissions p
                join sys_role_permissions rp on rp.permission_id = p.id
                join sys_roles r on r.id = rp.role_id
                join sys_user_roles ur on ur.role_id = rp.role_id
                where ur.user_id = ?
                  and p.is_active = true
                  and r.deleted_at is null
                order by p.permission_code
                """,
                String.class,
                userId);
        return new CurrentUserResponse(user.id(), user.name(), user.email(), roles, permissions);
    }

    private Long userIdFromActiveSession(String accessToken) {
        return sessionSubject(accessToken)
                .map(SessionSubject::userId)
                .orElseThrow(() -> new UnauthorizedException("登录状态已失效"));
    }

    private Optional<SessionSubject> sessionSubject(String accessToken) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(
                    """
                    select s.id, s.user_id
                    from sys_sessions s
                    join sys_users u on u.id = s.user_id
                    where s.session_token_hash = ?
                      and s.revoked_at is null
                      and s.expires_at > current_timestamp
                      and u.status = 'active'
                      and u.deleted_at is null
                      and exists (
                          select 1
                          from sys_login_accounts la
                          where la.user_id = u.id
                            and la.status = 'active'
                      )
                    """,
                    (rs, rowNum) -> new SessionSubject(rs.getLong("id"), rs.getLong("user_id")),
                    sha256(accessToken)));
        } catch (EmptyResultDataAccessException exception) {
            return Optional.empty();
        }
    }

    private Optional<LoginSubject> findLoginSubject(String username) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(
                    """
                    select la.id as login_account_id, la.status as login_account_status,
                           u.id as user_id, u.status as user_status
                    from sys_login_accounts la
                    join sys_users u on u.id = la.user_id
                    where la.login_type = 'username'
                      and la.login_identifier = ?
                    """,
                    (rs, rowNum) -> new LoginSubject(
                            rs.getLong("login_account_id"),
                            rs.getString("login_account_status"),
                            rs.getLong("user_id"),
                            rs.getString("user_status")),
                    username));
        } catch (EmptyResultDataAccessException exception) {
            return Optional.empty();
        }
    }

    private Optional<String> findPasswordHash(Long userId) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(
                    """
                    select password_hash
                    from sys_user_credentials
                    where user_id = ?
                      and credential_type = 'password'
                      and status = 'active'
                    """,
                    String.class,
                    userId));
        } catch (EmptyResultDataAccessException exception) {
            return Optional.empty();
        }
    }

    private LoginLogEntry loginFailure(
            Long userId,
            String loginIdentifier,
            String failureReason,
            HttpServletRequest request) {
        return new LoginLogEntry(
                userId,
                loginIdentifier,
                "login_failed",
                false,
                failureReason,
                ipAddress(request),
                userAgent(request),
                traceId(request));
    }

    private static String newSessionToken() {
        byte[] token = new byte[32];
        SECURE_RANDOM.nextBytes(token);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(token);
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes()));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private static String ipAddress(HttpServletRequest request) {
        return request.getRemoteAddr();
    }

    private static String userAgent(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }

    private static String traceId(HttpServletRequest request) {
        return (String) request.getAttribute("crm.traceId");
    }

    private record LoginSubject(Long loginAccountId, String loginAccountStatus, Long userId, String userStatus) {
    }

    private record SessionSubject(Long sessionId, Long userId) {
    }

    private record UserSummary(Long id, String name, String email) {
    }
}
