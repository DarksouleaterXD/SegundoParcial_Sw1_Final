package com.classforge.project.validation;
import com.classforge.project.domain.document.*;
import java.util.*;
final class UmlMethodValidator {
    private final Set<UUID> ids = new HashSet<>();
    void validate(UUID classId, List<UmlMethod> methods, ProjectValidationCollector collector) {
        String path = "document.umlModel.methods";
        if (methods.size() > 50) collector.error(path, "METHOD_LIMIT", classId, "Una clase admite hasta 50 métodos.");
        Set<String> signatures = new HashSet<>();
        for (UmlMethod method : methods) {
            if (method == null) { collector.error(path, "METHOD_REQUIRED", classId, "El método no puede ser nulo."); continue; }
            if (method.id() == null || !ids.add(method.id()))
                collector.error(path, "METHOD_ID_INVALID", classId, "El identificador del método es obligatorio y único.");
            if (!name(method.name()) || method.visibility() == null || !type(method.returnType()))
                collector.error(path, "METHOD_INVALID", classId, "Revisa el nombre, visibilidad y retorno del método.");
            if (method.parameters().size() > 20)
                collector.error(path, "PARAMETER_LIMIT", classId, "Un método admite hasta 20 parámetros.");
            Set<String> names = new HashSet<>();
            List<String> parameterTypes = new ArrayList<>();
            for (var parameter : method.parameters()) {
                if (parameter == null || !name(parameter.name()) || !names.add(parameter.name())
                        || !type(parameter.type()) || "void".equals(parameter.type())) {
                    collector.error(path, "METHOD_PARAMETER_INVALID", classId, "Los parámetros requieren nombres únicos y tipos válidos distintos de void.");
                }
                parameterTypes.add(parameter == null ? "" : parameter.type());
            }
            if (!signatures.add(method.name() + "(" + String.join(",", parameterTypes) + ")"))
                collector.error(path, "METHOD_SIGNATURE_DUPLICATE", classId, "La firma del método ya existe en esta clase.");
        }
    }
    private boolean name(String value) { return value != null && value.length() <= 80 && value.matches("[A-Za-z_][A-Za-z0-9_]*"); }
    private boolean type(String value) { return value != null && value.length() <= 120 && value.matches("[A-Za-z_][A-Za-z0-9_.]*(\\[\\])?"); }
}
