package com.classforge.collaboration.application;

import com.classforge.collaboration.protocol.UmlCommandPayload;
import com.classforge.project.domain.document.*;
import java.util.*;

final class ProjectCommandAttributeHandler {
    private final ProjectCommandExecutionSupport support;

    ProjectCommandAttributeHandler(ProjectCommandExecutionSupport support) {
        this.support = support;
    }

    ProjectDocument addAttribute(
            ProjectDocument current,
            UmlCommandPayload command
    ) {
        UUID classId =
                support.requireId(
                        command.classId(),
                        "CLASS_ID_REQUIRED",
                        "ADD_ATTRIBUTE requires classId"
                );

        UmlAttribute attribute =
                command.attribute();

        support.require(
                attribute != null,
                "ATTRIBUTE_REQUIRED",
                "ADD_ATTRIBUTE requires attribute"
        );

        support.require(
                attribute.id() != null,
                "ATTRIBUTE_ID_REQUIRED",
                "ADD_ATTRIBUTE requires attribute.id"
        );

        UmlAssociationClass associationClass = support.findAssociationClass(current, classId);
        if (associationClass != null) {
            boolean duplicateId = current.umlModel().classes().stream().flatMap(value -> value.attributes().stream()).anyMatch(value -> value.id().equals(attribute.id()))
                    || current.umlModel().associationClasses().stream().flatMap(value -> value.attributes().stream()).anyMatch(value -> value.id().equals(attribute.id()));
            support.require(!duplicateId, "DUPLICATE_ATTRIBUTE_ID", "An attribute with this id already exists");
            ArrayList<UmlAttribute> attributes = new ArrayList<>(associationClass.attributes()); attributes.add(attribute);
            ArrayList<UmlAssociationClass> associationClasses = support.associationClasses(current);
            associationClasses.set(associationClasses.indexOf(associationClass), new UmlAssociationClass(associationClass.id(), associationClass.name(), associationClass.associationId(), attributes, associationClass.methods()));
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

        ArrayList<UmlAttribute> attributes =
                new ArrayList<>(
                        existing.attributes()
                );

        boolean duplicateId =
                current.umlModel()
                        .classes()
                        .stream()
                        .flatMap(
                                umlClass ->
                                        umlClass.attributes()
                                                .stream()
                        )
                        .anyMatch(
                                candidate ->
                                        candidate.id()
                                                .equals(
                                                        attribute.id()
                                                )
                        );

        support.require(
                !duplicateId,
                "DUPLICATE_ATTRIBUTE_ID",
                "An attribute with this id already exists"
        );

        attributes.add(attribute);

        classes.set(
                index,
                new UmlClass(
                        existing.id(),
                        existing.name(),
                        attributes, existing.methods()
                )
        );

        return support.document(
                current,
                classes,
                support.relationships(current),
                support.nodes(current)
        );
    }

    ProjectDocument updateAttribute(
            ProjectDocument current,
            UmlCommandPayload command
    ) {
        UUID classId =
                support.requireId(
                        command.classId(),
                        "CLASS_ID_REQUIRED",
                        "UPDATE_ATTRIBUTE requires classId"
                );

        UmlAttribute attribute =
                command.attribute();

        support.require(
                attribute != null,
                "ATTRIBUTE_REQUIRED",
                "UPDATE_ATTRIBUTE requires attribute"
        );

        support.require(
                attribute.id() != null,
                "ATTRIBUTE_ID_REQUIRED",
                "UPDATE_ATTRIBUTE requires attribute.id"
        );

        UmlAssociationClass associationClass = support.findAssociationClass(current, classId);
        if (associationClass != null) {
            ArrayList<UmlAttribute> attributes = new ArrayList<>(associationClass.attributes());
            int attributeIndex = support.attributeIndex(attributes, attribute.id()); attributes.set(attributeIndex, attribute);
            ArrayList<UmlAssociationClass> associationClasses = support.associationClasses(current);
            associationClasses.set(associationClasses.indexOf(associationClass), new UmlAssociationClass(associationClass.id(), associationClass.name(), associationClass.associationId(), attributes, associationClass.methods()));
            return support.document(current, support.classes(current), support.relationships(current), associationClasses, support.nodes(current));
        }

        ArrayList<UmlClass> classes =
                support.classes(current);

        int classIndex =
                support.classIndex(
                        classes,
                        classId
                );

        UmlClass existing =
                classes.get(classIndex);

        ArrayList<UmlAttribute> attributes =
                new ArrayList<>(
                        existing.attributes()
                );

        int attributeIndex =
                support.attributeIndex(
                        attributes,
                        attribute.id()
                );

        attributes.set(
                attributeIndex,
                attribute
        );

        classes.set(
                classIndex,
                new UmlClass(
                        existing.id(),
                        existing.name(),
                        attributes, existing.methods()
                )
        );

        return support.document(
                current,
                classes,
                support.relationships(current),
                support.nodes(current)
        );
    }

    ProjectDocument deleteAttribute(
            ProjectDocument current,
            UmlCommandPayload command
    ) {
        UUID classId =
                support.requireId(
                        command.classId(),
                        "CLASS_ID_REQUIRED",
                        "DELETE_ATTRIBUTE requires classId"
                );

        UUID attributeId =
                support.requireId(
                        command.attributeId(),
                        "ATTRIBUTE_ID_REQUIRED",
                        "DELETE_ATTRIBUTE requires attributeId"
                );

        UmlAssociationClass associationClass = support.findAssociationClass(current, classId);
        if (associationClass != null) {
            ArrayList<UmlAttribute> attributes = new ArrayList<>(associationClass.attributes());
            attributes.remove(support.attributeIndex(attributes, attributeId));
            ArrayList<UmlAssociationClass> associationClasses = support.associationClasses(current);
            associationClasses.set(associationClasses.indexOf(associationClass), new UmlAssociationClass(associationClass.id(), associationClass.name(), associationClass.associationId(), attributes, associationClass.methods()));
            return support.document(current, support.classes(current), support.relationships(current), associationClasses, support.nodes(current));
        }

        ArrayList<UmlClass> classes =
                support.classes(current);

        int classIndex =
                support.classIndex(
                        classes,
                        classId
                );

        UmlClass existing =
                classes.get(classIndex);

        ArrayList<UmlAttribute> attributes =
                new ArrayList<>(
                        existing.attributes()
                );

        int attributeIndex =
                support.attributeIndex(
                        attributes,
                        attributeId
                );

        attributes.remove(
                attributeIndex
        );

        classes.set(
                classIndex,
                new UmlClass(
                        existing.id(),
                        existing.name(),
                        attributes, existing.methods()
                )
        );

        return support.document(
                current,
                classes,
                support.relationships(current),
                support.nodes(current)
        );
    }
}
