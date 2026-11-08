package com.classforge.project.domain.document;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public record UmlModel(
        List<UmlClass> classes,
        List<UmlRelationship> relationships,
        List<UmlAssociationClass> associationClasses
) {
    public UmlModel {
        classes = classes == null
                ? List.of()
                : Collections.unmodifiableList(new ArrayList<>(classes));

        relationships = relationships == null
                ? List.of()
                : Collections.unmodifiableList(new ArrayList<>(relationships));

        associationClasses = associationClasses == null
                ? List.of()
                : Collections.unmodifiableList(new ArrayList<>(associationClasses));
    }

    /** Compatibility constructor for documents and callers created before association classes. */
    public UmlModel(List<UmlClass> classes, List<UmlRelationship> relationships) {
        this(classes, relationships, List.of());
    }

    public static UmlModel empty() {
        return new UmlModel(List.of(), List.of(), List.of());
    }
}
