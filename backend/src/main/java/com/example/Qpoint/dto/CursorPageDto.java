package com.example.Qpoint.dto;

import lombok.Data;
import java.util.List;

@Data
public class CursorPageDto<T> {
    private List<T> content;
    private String nextCursor;
}
