package com.classforge.collaboration.protocol;

import com.classforge.project.domain.document.DiagramNodeLayout;
import com.classforge.project.domain.document.UmlAttribute;
import com.classforge.project.domain.document.UmlClass;
import com.classforge.project.domain.document.UmlAssociationClass;
import com.classforge.project.domain.document.UmlRelationship;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UmlCommandPayload(
        UUID commandId,
        Instant issuedAt,
        UmlCommandType type,
        UUID classId,
        String name,
        UmlClass umlClass,
        UmlAssociationClass associationClass,
        UUID associationClassId,
        DiagramNodeLayout layout,
        UmlAttribute attribute,
        UUID attributeId,
        UmlRelationship relationship,
        UUID relationshipId,
        List<UmlRelationship> relationships,
        List<UmlCommandPayload> commands,
        String label,
        List<com.classforge.project.domain.document.UmlMethod> methods
) {
    public UmlCommandPayload(UUID commandId, Instant issuedAt, UmlCommandType type, UUID classId,
            String name, UmlClass umlClass, UmlAssociationClass associationClass, UUID associationClassId,
            DiagramNodeLayout layout, UmlAttribute attribute, UUID attributeId, UmlRelationship relationship,
            UUID relationshipId, List<UmlRelationship> relationships, List<UmlCommandPayload> commands, String label) {
        this(commandId, issuedAt, type, classId, name, umlClass, associationClass, associationClassId,
            layout, attribute, attributeId, relationship, relationshipId, relationships, commands, label, null);
    }
    public UmlCommandPayload(
            UUID commandId,
            Instant issuedAt,
            UmlCommandType type,
            UUID classId,
            String name,
            UmlClass umlClass,
            DiagramNodeLayout layout,
            UmlAttribute attribute,
            UUID attributeId,
            UmlRelationship relationship,
            UUID relationshipId
    ) {
        this(
                commandId,
                issuedAt,
                type,
                classId,
                name,
                umlClass,
                null,
                null,
                layout,
                attribute,
                attributeId,
                relationship,
                relationshipId,
                List.of(),
                List.of(),
                null
        );
    }

    public UmlCommandPayload(
            UUID commandId,
            Instant issuedAt,
            UmlCommandType type,
            UUID classId,
            String name,
            UmlClass umlClass,
            DiagramNodeLayout layout,
            UmlAttribute attribute,
            UUID attributeId,
            UmlRelationship relationship,
            UUID relationshipId,
            List<UmlRelationship> relationships
    ) {
        this(
                commandId,
                issuedAt,
                type,
                classId,
                name,
                umlClass,
                null,
                null,
                layout,
                attribute,
                attributeId,
                relationship,
                relationshipId,
                relationships,
                List.of(),
                null
        );
    }

    public List<UmlRelationship> safeRelationships() {
        return relationships == null
                ? List.of()
                : List.copyOf(relationships);
    }

    public List<UmlCommandPayload> safeCommands() {
        return commands == null
                ? List.of()
                : List.copyOf(commands);
    }

    public static UmlCommandPayload batch(
            String label,
            List<UmlCommandPayload> commands
    ) {
        return new UmlCommandPayload(
                UUID.randomUUID(),
                Instant.now(),
                UmlCommandType.BATCH,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                List.of(),
                commands,
                label
        );
    }
}
