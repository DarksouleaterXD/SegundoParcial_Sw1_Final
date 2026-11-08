package com.classforge.collaboration.application;

import com.classforge.collaboration.protocol.UmlCommandPayload;
import com.classforge.project.domain.document.*;
import java.util.*;

final class ProjectCommandClassHandler {
    private final ProjectCommandExecutionSupport support;

    ProjectCommandClassHandler(ProjectCommandExecutionSupport support) {
        this.support = support;
    }

    ProjectDocument createClass(
            ProjectDocument current,
            UmlCommandPayload command
    ) {
        UmlClass umlClass =
                command.umlClass();

        DiagramNodeLayout layout =
                command.layout();

        support.require(
                umlClass != null,
                "CLASS_REQUIRED",
                "CREATE_CLASS requires umlClass"
        );

        support.require(
                umlClass.id() != null,
                "CLASS_ID_REQUIRED",
                "CREATE_CLASS requires umlClass.id"
        );

        support.require(
                layout != null,
                "LAYOUT_REQUIRED",
                "CREATE_CLASS requires layout"
        );

        support.require(
                support.findClass(
                        current,
                        umlClass.id()
                ) == null && support.findAssociationClass(current, umlClass.id()) == null,
                "DUPLICATE_CLASS_ID",
                "A class with this id already exists"
        );

        ArrayList<UmlClass> classes =
                support.classes(current);

        classes.add(umlClass);

        HashMap<UUID, DiagramNodeLayout> nodes =
                support.nodes(current);

        nodes.put(
                umlClass.id(),
                layout
        );

        return support.document(
                current,
                classes,
                support.relationships(current),
                nodes
        );
    }

    ProjectDocument restoreClass(
            ProjectDocument current,
            UmlCommandPayload command
    ) {
        UmlClass umlClass =
                command.umlClass();

        support.require(
                umlClass != null,
                "CLASS_REQUIRED",
                "RESTORE_CLASS requires umlClass"
        );

        support.require(
                umlClass.id() != null,
                "CLASS_ID_REQUIRED",
                "RESTORE_CLASS requires umlClass.id"
        );

        support.require(
                support.findClass(
                        current,
                        umlClass.id()
                ) == null && support.findAssociationClass(current, umlClass.id()) == null,
                "DUPLICATE_CLASS_ID",
                "A class with this id already exists"
        );

        ArrayList<UmlClass> classes =
                support.classes(current);

        classes.add(
                umlClass
        );

        HashMap<UUID, DiagramNodeLayout> nodes =
                support.nodes(current);

        if (command.layout() != null) {
            nodes.put(
                    umlClass.id(),
                    command.layout()
            );
        }

        ArrayList<UmlRelationship> restoredRelationships =
                support.relationships(current);

        for (
                UmlRelationship relationship
                : command.safeRelationships()
        ) {
            support.require(
                    relationship != null
                            && relationship.id() != null,
                    "RELATIONSHIP_REQUIRED",
                    "RESTORE_CLASS received an invalid relationship"
            );

            support.require(
                    relationship.sourceClassId()
                            .equals(umlClass.id())
                            || relationship.targetClassId()
                            .equals(umlClass.id()),
                    "RESTORE_RELATIONSHIP_NOT_CONNECTED",
                    "RESTORE_CLASS can only restore relationships connected to the class"
            );

            boolean duplicateRelationshipId =
                    restoredRelationships
                            .stream()
                            .anyMatch(
                                    candidate ->
                                            candidate.id()
                                                    .equals(
                                                            relationship.id()
                                                    )
                            );

            support.require(
                    !duplicateRelationshipId,
                    "DUPLICATE_RELATIONSHIP_ID",
                    "A restored relationship id already exists"
            );

            restoredRelationships.add(
                    support.normalizeRelationship(
                            relationship
                    )
            );
        }

        return support.document(
                current,
                classes,
                restoredRelationships,
                nodes
        );
    }

    ProjectDocument renameClass(
            ProjectDocument current,
            UmlCommandPayload command
    ) {
        UUID classId =
                support.requireId(
                        command.classId(),
                        "CLASS_ID_REQUIRED",
                        "RENAME_CLASS requires classId"
                );

        support.requireText(
                command.name(),
                "CLASS_NAME_REQUIRED",
                "RENAME_CLASS requires name"
        );

        UmlAssociationClass associationClass = support.findAssociationClass(current, classId);
        if (associationClass != null) {
            ArrayList<UmlAssociationClass> associationClasses = support.associationClasses(current);
            associationClasses.set(associationClasses.indexOf(associationClass), new UmlAssociationClass(associationClass.id(), command.name(), associationClass.associationId(), associationClass.attributes(), associationClass.methods()));
            return support.document(current, support.classes(current), support.relationships(current), associationClasses, support.nodes(current));
        }

        ArrayList<UmlClass> classes =
                support.classes(current);

        int index =
                support.classIndex(
                        classes,
                        classId
                );

        UmlClass existing =
                classes.get(index);

        classes.set(
                index,
                new UmlClass(
                        existing.id(),
                        command.name(),
                        existing.attributes(), existing.methods()
                )
        );

        return support.document(
                current,
                classes,
                support.relationships(current),
                support.nodes(current)
        );
    }

    ProjectDocument deleteClass(
            ProjectDocument current,
            UmlCommandPayload command
    ) {
        UUID classId =
                support.requireId(
                        command.classId(),
                        "CLASS_ID_REQUIRED",
                        "DELETE_CLASS requires classId"
                );

        ArrayList<UmlClass> classes =
                support.classes(current);

        int classIndex =
                support.classIndex(
                        classes,
                        classId
                );

        classes.remove(classIndex);

        ArrayList<UmlRelationship> relationships =
                support.relationships(current);

        relationships.removeIf(
                relationship ->
                        relationship.sourceClassId()
                                .equals(classId)
                                || relationship.targetClassId()
                                .equals(classId)
        );

        Set<UUID> removedRelationshipIds = new HashSet<>();
        for (UmlRelationship relationship : current.umlModel().relationships()) {
            if (relationship.sourceClassId().equals(classId) || relationship.targetClassId().equals(classId)) {
                removedRelationshipIds.add(relationship.id());
            }
        }
        ArrayList<UmlAssociationClass> associationClasses = support.associationClasses(current);
        Set<UUID> removedAssociationClassIds = new HashSet<>();
        associationClasses.removeIf(value -> {
            boolean remove = removedRelationshipIds.contains(value.associationId());
            if (remove) removedAssociationClassIds.add(value.id());
            return remove;
        });

        HashMap<UUID, DiagramNodeLayout> nodes =
                support.nodes(current);

        nodes.remove(classId);
        removedAssociationClassIds.forEach(nodes::remove);

        return support.document(current, classes, relationships, associationClasses, nodes);
    }
}
