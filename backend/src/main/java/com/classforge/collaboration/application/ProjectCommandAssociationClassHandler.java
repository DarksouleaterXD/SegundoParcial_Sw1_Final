package com.classforge.collaboration.application;

import com.classforge.collaboration.protocol.UmlCommandPayload;
import com.classforge.project.domain.document.*;
import java.util.*;

/** Command handler for first-class UML AssociationClasses. */
final class ProjectCommandAssociationClassHandler {
    private final ProjectCommandExecutionSupport support;
    ProjectCommandAssociationClassHandler(ProjectCommandExecutionSupport support) { this.support = support; }

    ProjectDocument create(ProjectDocument current, UmlCommandPayload command) {
        UmlAssociationClass value = command.associationClass();
        support.require(value != null && value.id() != null, "ASSOCIATION_CLASS_REQUIRED", "CREATE_ASSOCIATION_CLASS requires associationClass");
        support.require(value.associationId() != null, "ASSOCIATION_CLASS_ASSOCIATION_REQUIRED", "An associationId is required");
        support.require(command.layout() != null, "LAYOUT_REQUIRED", "CREATE_ASSOCIATION_CLASS requires layout");
        UmlRelationship relationship = current.umlModel().relationships().stream().filter(r -> r.id().equals(value.associationId())).findFirst().orElse(null);
        support.require(relationship != null, "ASSOCIATION_NOT_FOUND", "The association no longer exists");
        support.require(relationship.type() == UmlRelationshipType.ASSOCIATION, "ASSOCIATION_CLASS_REQUIRES_ASSOCIATION", "An association class must link a UML association");
        var associationClasses = support.associationClasses(current);
        support.require(associationClasses.stream().noneMatch(c -> c.id().equals(value.id())) && support.findClass(current, value.id()) == null, "DUPLICATE_ASSOCIATION_CLASS_ID", "An association class with this id already exists");
        support.require(associationClasses.stream().noneMatch(c -> c.associationId().equals(value.associationId())), "ASSOCIATION_ALREADY_HAS_ASSOCIATION_CLASS", "This association already has an association class");
        associationClasses.add(value);
        var nodes = support.nodes(current); nodes.put(value.id(), command.layout());
        return support.document(current, support.classes(current), support.relationships(current), associationClasses, nodes);
    }

    ProjectDocument delete(ProjectDocument current, UmlCommandPayload command) {
        UUID id = support.requireId(command.associationClassId(), "ASSOCIATION_CLASS_ID_REQUIRED", "DELETE_ASSOCIATION_CLASS requires associationClassId");
        var associationClasses = support.associationClasses(current);
        boolean removed = associationClasses.removeIf(c -> c.id().equals(id));
        support.require(removed, "ASSOCIATION_CLASS_NOT_FOUND", "The association class no longer exists");
        var nodes = support.nodes(current); nodes.remove(id);
        return support.document(current, support.classes(current), support.relationships(current), associationClasses, nodes);
    }

    ProjectDocument restore(ProjectDocument current, UmlCommandPayload command) { return create(current, command); }
}
