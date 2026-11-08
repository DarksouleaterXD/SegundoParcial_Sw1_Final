package com.classforge.project.domain.document;
import java.util.*;
public record UmlMethod(UUID id, String name, UmlVisibility visibility, String returnType, List<Parameter> parameters) {
    public UmlMethod { parameters = parameters == null ? List.of() : Collections.unmodifiableList(new ArrayList<>(parameters)); }
    public record Parameter(String name, String type) {}
}
