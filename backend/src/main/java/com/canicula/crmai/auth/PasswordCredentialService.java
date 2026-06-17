package com.canicula.crmai.auth;

import java.nio.charset.StandardCharsets;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.KeySpec;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordCredentialService {

    private static final int ITERATIONS = 120_000;
    private static final int KEY_LENGTH = 256;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final JdbcTemplate jdbcTemplate;

    PasswordCredentialService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public void createPasswordCredential(Long userId, String rawPassword) {
        jdbcTemplate.update(
                """
                insert into sys_user_credentials (
                    user_id, credential_type, password_hash, password_algo, status
                )
                values (?, 'password', ?, 'PBKDF2WithHmacSHA256', 'active')
                """,
                userId,
                hash(rawPassword));
    }

    @Transactional
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        String currentHash = jdbcTemplate.queryForObject(
                """
                select password_hash
                from sys_user_credentials
                where user_id = ?
                  and credential_type = 'password'
                  and status = 'active'
                """,
                String.class,
                userId);
        if (!matches(oldPassword, currentHash)) {
            throw new UnauthorizedException("旧密码不正确");
        }
        updatePassword(userId, newPassword, false);
    }

    @Transactional
    public void resetPassword(Long userId, String newPassword) {
        updatePassword(userId, newPassword, true);
    }

    boolean matches(String rawPassword, String encodedPassword) {
        String[] parts = encodedPassword.split("\\$");
        if (parts.length != 4 || !"pbkdf2".equals(parts[0])) {
            return false;
        }
        int iterations = Integer.parseInt(parts[1]);
        byte[] salt = Base64.getDecoder().decode(parts[2]);
        String expected = parts[3];
        String actual = Base64.getEncoder().encodeToString(pbkdf2(rawPassword.toCharArray(), salt, iterations));
        return java.security.MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8));
    }

    private String hash(String rawPassword) {
        byte[] salt = new byte[16];
        SECURE_RANDOM.nextBytes(salt);
        return "pbkdf2$" + ITERATIONS + "$"
                + Base64.getEncoder().encodeToString(salt) + "$"
                + Base64.getEncoder().encodeToString(pbkdf2(rawPassword.toCharArray(), salt, ITERATIONS));
    }

    private void updatePassword(Long userId, String rawPassword, boolean forcePasswordChange) {
        int updated = jdbcTemplate.update(
                """
                update sys_user_credentials
                set password_hash = ?,
                    password_algo = 'PBKDF2WithHmacSHA256',
                    password_updated_at = current_timestamp,
                    status = 'active',
                    updated_at = current_timestamp
                where user_id = ?
                  and credential_type = 'password'
                """,
                hash(rawPassword),
                userId);
        if (updated == 0) {
            createPasswordCredential(userId, rawPassword);
        }
        jdbcTemplate.update(
                "update sys_users set force_password_change = ? where id = ?",
                forcePasswordChange,
                userId);
    }

    private byte[] pbkdf2(char[] password, byte[] salt, int iterations) {
        try {
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            KeySpec spec = new PBEKeySpec(password, salt, iterations, KEY_LENGTH);
            return factory.generateSecret(spec).getEncoded();
        } catch (NoSuchAlgorithmException | InvalidKeySpecException exception) {
            throw new IllegalStateException("PBKDF2 password hashing is unavailable", exception);
        }
    }
}
