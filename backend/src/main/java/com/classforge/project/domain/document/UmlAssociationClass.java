package com.classforge.project.domain.document;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/** A UML AssociationClass: a classifier owned by exactly one association. */
public record UmlAssociationClass(
        UUID id,
        String name,
        UUID associationId,
        List<UmlAttribute> attributes,
        List<UmlMethod> methods
) {
    public UmlAssociationClass {
        methods = methods == null ? List.of() : Collections.unmodifiableList(new ArrayList<>(methods));
        attributes = attributes == null
                ? List.of()
                : Collections.unmodifiableList(new ArrayList<>(attributes));
    }
    public UmlAssociationClass(UUID id, String name, UUID associationId, List<UmlAttribute> attributes) {
        this(id, name, associationId, attributes, List.of());
    }
}
