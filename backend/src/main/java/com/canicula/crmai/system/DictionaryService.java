package com.canicula.crmai.system;

import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DictionaryService {

    private final JdbcTemplate jdbcTemplate;

    DictionaryService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<DictionaryTypeResponse> list(String dictCode, boolean includeInactive) {
        List<Object> parameters = new ArrayList<>();
        StringBuilder sql = new StringBuilder("""
                select id, dict_code, dict_name, description, is_active
                from sys_dict_types
                where deleted_at is null
                """);
        if (!includeInactive) {
            sql.append(" and is_active = true");
        }
        if (dictCode != null && !dictCode.isBlank()) {
            sql.append(" and dict_code = ?");
            parameters.add(dictCode);
        }
        sql.append(" order by dict_code");

        return jdbcTemplate.query(
                sql.toString(),
                (rs, rowNum) -> new DictionaryTypeResponse(
                        rs.getLong("id"),
                        rs.getString("dict_code"),
                        rs.getString("dict_name"),
                        rs.getString("description"),
                        rs.getBoolean("is_active"),
                        listItems(rs.getLong("id"), includeInactive)),
                parameters.toArray());
    }

    @Transactional
    public DictionaryTypeResponse createType(DictionaryTypeRequest request) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into sys_dict_types (dict_code, dict_name, description)
                    values (?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setString(1, request.dict_code());
            statement.setString(2, request.dict_name());
            statement.setString(3, request.description());
            return statement;
        }, keyHolder);

        Long id = Objects.requireNonNull(keyHolder.getKey()).longValue();
        return getType(id, true);
    }

    @Transactional
    public DictionaryItemResponse createItem(Long dictTypeId, DictionaryItemRequest request) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    insert into sys_dict_items (dict_type_id, item_code, item_name, sort_order)
                    values (?, ?, ?, ?)
                    """,
                    new String[] {"id"});
            statement.setLong(1, dictTypeId);
            statement.setString(2, request.item_code());
            statement.setString(3, request.item_name());
            statement.setInt(4, request.sort_order() == null ? 0 : request.sort_order());
            return statement;
        }, keyHolder);

        Long id = Objects.requireNonNull(keyHolder.getKey()).longValue();
        return getItem(id);
    }

    @Transactional
    public DictionaryItemResponse updateItem(Long itemId, DictionaryItemUpdateRequest request) {
        jdbcTemplate.update(
                """
                update sys_dict_items
                set item_name = coalesce(?, item_name),
                    sort_order = coalesce(?, sort_order),
                    is_active = coalesce(?, is_active),
                    updated_at = current_timestamp,
                    version = version + 1
                where id = ?
                  and deleted_at is null
                """,
                request.item_name(),
                request.sort_order(),
                request.is_active(),
                itemId);
        return getItem(itemId);
    }

    private DictionaryTypeResponse getType(Long id, boolean includeInactive) {
        return jdbcTemplate.queryForObject(
                """
                select id, dict_code, dict_name, description, is_active
                from sys_dict_types
                where id = ?
                  and deleted_at is null
                """,
                (rs, rowNum) -> new DictionaryTypeResponse(
                        rs.getLong("id"),
                        rs.getString("dict_code"),
                        rs.getString("dict_name"),
                        rs.getString("description"),
                        rs.getBoolean("is_active"),
                        listItems(rs.getLong("id"), includeInactive)),
                id);
    }

    private DictionaryItemResponse getItem(Long id) {
        return jdbcTemplate.queryForObject(
                """
                select id, item_code, item_name, sort_order, is_active
                from sys_dict_items
                where id = ?
                  and deleted_at is null
                """,
                (rs, rowNum) -> new DictionaryItemResponse(
                        rs.getLong("id"),
                        rs.getString("item_code"),
                        rs.getString("item_name"),
                        rs.getInt("sort_order"),
                        rs.getBoolean("is_active")),
                id);
    }

    private List<DictionaryItemResponse> listItems(Long dictTypeId, boolean includeInactive) {
        String sql = """
                select id, item_code, item_name, sort_order, is_active
                from sys_dict_items
                where dict_type_id = ?
                  and deleted_at is null
                """;
        if (!includeInactive) {
            sql += " and is_active = true";
        }
        sql += " order by sort_order, id";

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new DictionaryItemResponse(
                        rs.getLong("id"),
                        rs.getString("item_code"),
                        rs.getString("item_name"),
                        rs.getInt("sort_order"),
                        rs.getBoolean("is_active")),
                dictTypeId);
    }
}
