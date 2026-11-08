package com.classforge.project.validation;

import com.classforge.project.domain.document.*;
import java.util.*;

/** Validates the semantic link between an AssociationClass and its association. */
final class UmlAssociationClassValidator {
    private final UmlClassValidator classValidator = new UmlClassValidator();

    void validate(List<UmlAssociationClass> associationClasses, List<UmlClass> classes,
                  List<UmlRelationship> relationships, ProjectValidationCollector collector) {
        Set<UUID> ids = new HashSet<>();
        Set<UUID> associationIds = new HashSet<>();
        Set<String> names = new HashSet<>();
        for (UmlClass c : classes) {
            if (c != null && c.id() != null) ids.add(c.id());
            if (c != null && c.name() != null) names.add(c.name().toLowerCase(Locale.ROOT));
        }
        Set<UUID> knownRelationships = new HashSet<>();
        for (UmlRelationship r : relationships) if (r != null && r.id() != null) knownRelationships.add(r.id());
        for (int i = 0; i < associationClasses.size(); i++) {
            UmlAssociationClass value = associationClasses.get(i);
            String path = "document.umlModel.associationClasses[" + i + "]";
            if (value == null) { collector.error(path, "ASSOCIATION_CLASS_REQUIRED", null, "La clase de asociación no puede ser nula."); continue; }
            if (value.id() == null || !ids.add(value.id())) collector.error(path + ".id", "DUPLICATE_ASSOCIATION_CLASS_ID", value.id(), "La clase de asociación necesita un identificador único.");
            classValidator.validateClasses(List.of(new UmlClass(value.id(), value.name(), value.attributes())), collector);
            if (value.name() != null && !names.add(value.name().toLowerCase(Locale.ROOT))) collector.error(path + ".name", "DUPLICATE_CLASS_NAME", value.id(), "Ya existe otro clasificador con ese nombre.");
            UmlRelationship relationship = relationships.stream().filter(candidate -> candidate != null && Objects.equals(candidate.id(), value.associationId())).findFirst().orElse(null);
            if (relationship == null) collector.error(path + ".associationId", "ASSOCIATION_CLASS_ASSOCIATION_NOT_FOUND", value.id(), "La clase de asociación debe vincular una relación existente.");
            else if (relationship.type() != UmlRelationshipType.ASSOCIATION) collector.error(path + ".associationId", "ASSOCIATION_CLASS_REQUIRES_ASSOCIATION", value.id(), "La clase de asociación debe vincular una asociación UML.");
            else if (!associationIds.add(value.associationId())) collector.error(path + ".associationId", "ASSOCIATION_ALREADY_HAS_ASSOCIATION_CLASS", value.id(), "Una relación solo puede tener una clase de asociación.");
        }
    }
}
