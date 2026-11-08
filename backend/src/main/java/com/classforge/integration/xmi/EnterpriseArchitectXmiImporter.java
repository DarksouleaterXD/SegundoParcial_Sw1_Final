package com.classforge.integration.xmi;

import com.classforge.project.domain.document.DiagramLayout;
import com.classforge.project.domain.document.DiagramNodeLayout;
import com.classforge.project.domain.document.Multiplicity;
import com.classforge.project.domain.document.ProjectDocument;
import com.classforge.project.domain.document.UmlAttribute;
import com.classforge.project.domain.document.UmlClass;
import com.classforge.project.domain.document.UmlAssociationClass;
import com.classforge.project.domain.document.UmlDataType;
import com.classforge.project.domain.document.UmlModel;
import com.classforge.project.domain.document.UmlRelationship;
import com.classforge.project.domain.document.UmlRelationshipType;
import com.classforge.project.domain.document.UmlVisibility;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class EnterpriseArchitectXmiImporter {

    static final int MAX_XMI_BYTES = 5 * 1024 * 1024;
    private static final Pattern EA_UUID = Pattern.compile("^(?:EAID_|EAPK_|CF_)([0-9A-Fa-f]{32})$");

    public XmiImportResult importXmi(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            throw invalid("XMI_EMPTY", "El archivo XMI esta vacio.");
        }
        if (bytes.length > MAX_XMI_BYTES) {
            throw invalid("XMI_TOO_LARGE", "El archivo XMI supera el limite de 5 MiB.");
        }

        Document xml = parseSecurely(bytes);
        Element root = xml.getDocumentElement();
        if (root == null) {
            throw invalid("XMI_ROOT_MISSING", "El XML no contiene un elemento raiz.");
        }

        validateXmiVersion(root);

        List<Element> roots = umlRoots(root);
        if (roots.isEmpty()) {
            throw invalid("XMI_UML_MODEL_MISSING", "No se encontro uml:Model ni uml:Package en el XMI.");
        }

        ImportContext context = new ImportContext();
        for (Element umlRoot : roots) {
            if (is(umlRoot, "Package")) {
                context.packageCount++;
            }
            collectPackagedElements(umlRoot, context);
        }
        collectEnterpriseArchitectAssociationClassLinks(root, context);

        if (context.classElements.isEmpty()) {
            throw invalid("XMI_CLASS_MISSING", "El XMI no contiene clases UML soportadas.");
        }

        indexTypes(context);
        indexClasses(context);
        indexProperties(context);

        List<UmlClass> classes = importClasses(context);
        List<UmlRelationship> relationships = importRelationships(context);
        relationships.addAll(importGeneralizations(context));
        List<UmlAssociationClass> associationClasses = importAssociationClasses(context, relationships);

        Map<UUID, DiagramNodeLayout> nodes = new LinkedHashMap<>();
        for (int i = 0; i < classes.size(); i++) {
            nodes.put(classes.get(i).id(), DiagramNodeLayout.defaultForIndex(i));
        }
        for (int i = 0; i < associationClasses.size(); i++) {
            nodes.put(associationClasses.get(i).id(), DiagramNodeLayout.defaultForIndex(classes.size() + i));
        }

        int attributes = classes.stream().mapToInt(item -> item.attributes().size()).sum()
                + associationClasses.stream().mapToInt(item -> item.attributes().size()).sum();
        if (context.packageCount > 1) {
            context.diagnostics.add(new XmiDiagnostic(
                    XmiDiagnosticSeverity.WARNING,
                    "XMI_PACKAGES_FLATTENED",
                    "ClassForge aplana " + context.packageCount + " paquetes XMI porque ProjectDocument no modela jerarquia de paquetes."
            ));
        }
        if (context.unsupportedElements > 0) {
            context.diagnostics.add(new XmiDiagnostic(
                    XmiDiagnosticSeverity.WARNING,
                    "XMI_UNSUPPORTED_ELEMENTS_IGNORED",
                    "Se ignoraron " + context.unsupportedElements + " elementos XMI fuera del subconjunto soportado."
            ));
        }

        ProjectDocument document = new ProjectDocument(
                ProjectDocument.CURRENT_SCHEMA_VERSION,
                new UmlModel(classes, relationships, associationClasses),
                new DiagramLayout(nodes)
        );

        return new XmiImportResult(
                document,
                context.packageCount,
                classes.size(),
                associationClasses.size(),
                attributes,
                relationships.size(),
                context.diagnostics
        );
    }

    private Document parseSecurely(byte[] bytes) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            return factory.newDocumentBuilder().parse(new ByteArrayInputStream(bytes));
        } catch (ParserConfigurationException exception) {
            throw new IllegalStateException("No se pudo configurar el parser XMI seguro.", exception);
        } catch (SAXException | IOException exception) {
            throw invalid("XMI_INVALID_XML", "El archivo no es XML/XMI valido o contiene construcciones XML no permitidas.", exception);
        }
    }

    private void validateXmiVersion(Element root) {
        String version = xmiAttr(root, "version");
        if (!version.isBlank() && !version.startsWith("2.1")) {
            throw invalid("XMI_VERSION_UNSUPPORTED", "Se requiere XMI 2.1; version recibida: " + version + ".");
        }
    }

    private List<Element> umlRoots(Element root) {
        List<Element> roots = new ArrayList<>();
        if (is(root, "Model") || is(root, "Package")) {
            roots.add(root);
            return roots;
        }
        for (Element child : childElements(root)) {
            if (is(child, "Model") || is(child, "Package")) {
                roots.add(child);
            }
        }
        return roots;
    }

    private void collectPackagedElements(Element parent, ImportContext context) {
        for (Element child : childElements(parent)) {
            if (!is(child, "packagedElement") && !is(child, "nestedPackage")) {
                continue;
            }
            String type = xmiType(child);
            if (type.endsWith("Package") || is(child, "nestedPackage")) {
                context.packageCount++;
                collectPackagedElements(child, context);
            } else if (type.endsWith("AssociationClass")) {
                context.associationClassElements.add(child);
            } else if (type.endsWith("Class")) {
                context.classElements.add(child);
            } else if (type.endsWith("Association")) {
                context.associationElements.add(child);
            } else if (type.endsWith("DataType") || type.endsWith("PrimitiveType")) {
                context.dataTypeElements.add(child);
            } else {
                context.unsupportedElements++;
            }
        }
    }

    private void indexTypes(ImportContext context) {
        for (Element type : context.dataTypeElements) {
            String id = requiredXmiId(type, "DataType");
            String name = requiredName(type, "DataType");
            context.typeNames.put(id, name);
        }
    }

    private void indexClasses(ImportContext context) {
        Set<UUID> ids = new HashSet<>();
        for (Element classElement : context.classElements) {
            String xmiId = requiredXmiId(classElement, "Class");
            UUID id = stableUuid(xmiId);
            if (!ids.add(id)) {
                throw invalid("XMI_DUPLICATE_CLASS_ID", "Dos clases XMI producen el mismo identificador: " + xmiId + ".");
            }
            context.classIds.put(xmiId, id);
            context.classNames.put(xmiId, requiredName(classElement, "Class"));
        }
    }

    private void indexProperties(ImportContext context) {
        for (Element classElement : context.classElements) {
            for (Element child : childElements(classElement)) {
                if (is(child, "ownedAttribute")) {
                    String propertyId = xmiAttr(child, "id");
                    if (!propertyId.isBlank()) {
                        context.propertiesById.put(propertyId, child);
                    }
                }
            }
        }
        for (Element association : context.associationElements) {
            for (Element child : childElements(association)) {
                if (is(child, "ownedEnd")) {
                    String propertyId = xmiAttr(child, "id");
                    if (!propertyId.isBlank()) {
                        context.propertiesById.put(propertyId, child);
                    }
                }
            }
        }
    }

    private List<UmlClass> importClasses(ImportContext context) {
        List<UmlClass> classes = new ArrayList<>();
        for (Element classElement : context.classElements) {
            String classXmiId = requiredXmiId(classElement, "Class");
            List<UmlAttribute> attributes = new ArrayList<>();
            for (Element property : childElements(classElement)) {
                if (!is(property, "ownedAttribute")) {
                    continue;
                }
                if (!plainAttr(property, "association").isBlank()) {
                    continue;
                }
                attributes.add(importAttribute(property, context));
            }
            classes.add(new UmlClass(
                    context.classIds.get(classXmiId),
                    context.classNames.get(classXmiId),
                    attributes, importMethods(classElement, context)
            ));
        }
        return List.copyOf(classes);
    }

    private List<UmlAssociationClass> importAssociationClasses(ImportContext context, List<UmlRelationship> relationships) {
        List<UmlAssociationClass> result = new ArrayList<>();
        for (Element element : context.associationClassElements) {
            String associationClassXmiId = requiredXmiId(element, "AssociationClass");
            UUID associationId = resolveAssociationClassAssociation(element, associationClassXmiId, context, relationships);
            if (associationId == null) {
                context.diagnostics.add(new XmiDiagnostic(XmiDiagnosticSeverity.WARNING, "XMI_ASSOCIATION_CLASS_ASSOCIATION_MISSING", "Se omitió una clase de asociación sin una relación compatible."));
                continue;
            }
            List<UmlAttribute> attributes = new ArrayList<>();
            for (Element property : childElements(element)) {
                if (is(property, "ownedAttribute")) attributes.add(importAttribute(property, context));
            }
            result.add(new UmlAssociationClass(stableUuid(associationClassXmiId), requiredName(element, "AssociationClass"), associationId, attributes, importMethods(element, context)));
        }
        return List.copyOf(result);
    }

    /**
     * EA stores the AssociationClass linkage in xmi:Extension instead of the
     * standard association attribute.  The connector only confirms that the
     * classifier is an association class; its owned ends identify the existing
     * canonical association, so no extra relationship is created.
     */
    private UUID resolveAssociationClassAssociation(
            Element associationClass,
            String associationClassXmiId,
            ImportContext context,
            List<UmlRelationship> relationships
    ) {
        String directReference = plainAttr(associationClass, "association");
        if (!directReference.isBlank()) {
            UUID directId = stableUuid(directReference);
            if (relationships.stream().anyMatch(item -> item.id().equals(directId))) {
                return directId;
            }
        }

        List<Element> endElements = associationEnds(associationClass, context);
        if (endElements.size() != 2) {
            return null;
        }

        AssociationEnd firstEnd = associationEnd(endElements.getFirst(), context);
        AssociationEnd secondEnd = associationEnd(endElements.get(1), context);
        UUID first = firstEnd.classId();
        UUID second = secondEnd.classId();
        List<UmlRelationship> matches = relationships.stream()
                .filter(item -> item.type() == UmlRelationshipType.ASSOCIATION)
                .filter(item -> sameEndpoints(item, first, second))
                .sorted(java.util.Comparator.comparing(item -> item.id().toString()))
                .toList();
        if (matches.size() == 1) {
            return matches.getFirst().id();
        }

        if (context.enterpriseAssociationClassIds.contains(associationClassXmiId)) {
            context.diagnostics.add(new XmiDiagnostic(
                    XmiDiagnosticSeverity.WARNING,
                    "XMI_EA_ASSOCIATION_CLASS_CONNECTOR_UNRESOLVED",
                    "Enterprise Architect marcó la clase de asociación " + requiredName(associationClass, "AssociationClass") + ", pero no se encontró una asociación UML única entre sus extremos."
            ));
        }
        return null;
    }

    private boolean sameEndpoints(UmlRelationship relationship, UUID first, UUID second) {
        return (relationship.sourceClassId().equals(first) && relationship.targetClassId().equals(second))
                || (relationship.sourceClassId().equals(second) && relationship.targetClassId().equals(first));
    }

    private void collectEnterpriseArchitectAssociationClassLinks(Element root, ImportContext context) {
        Map<String, String> connectorByElement = new HashMap<>();
        Map<String, String> associationClassByConnector = new HashMap<>();
        for (Element extension : descendants(root, "Extension")) {
            for (Element element : descendants(extension, "element")) {
                String elementId = xmiAttr(element, "idref");
                Element properties = firstChild(element, "extendedProperties");
                String connectorId = properties == null ? "" : plainAttr(properties, "conID");
                if (!elementId.isBlank() && !connectorId.isBlank()) {
                    connectorByElement.put(elementId, connectorId);
                }
            }
            for (Element connector : descendants(extension, "connector")) {
                String connectorId = xmiAttr(connector, "idref");
                Element properties = firstChild(connector, "properties");
                Element extendedProperties = firstChild(connector, "extendedProperties");
                if (connectorId.isBlank() || properties == null || extendedProperties == null) {
                    continue;
                }
                boolean associationClassConnector = "Association".equalsIgnoreCase(plainAttr(properties, "ea_type"))
                        && "Class".equalsIgnoreCase(plainAttr(properties, "subtype"));
                String associationClassId = plainAttr(extendedProperties, "associationclass");
                if (associationClassConnector && !associationClassId.isBlank()) {
                    associationClassByConnector.put(connectorId, associationClassId);
                }
            }
        }
        for (Map.Entry<String, String> entry : connectorByElement.entrySet()) {
            if (entry.getKey().equals(associationClassByConnector.get(entry.getValue()))) {
                context.enterpriseAssociationClassIds.add(entry.getKey());
            }
        }
    }

    private UmlAttribute importAttribute(Element property, ImportContext context) {
        String xmiId = requiredXmiId(property, "Property");
        String name = requiredName(property, "Property");
        TypeMapping type = resolveAttributeType(property, context);
        Multiplicity multiplicity = multiplicity(property);
        boolean nullable = multiplicity.lower() == 0;
        boolean identifier = truthy(attrAny(property, "isID", "isId", "identifier"));

        return new UmlAttribute(
                stableUuid(xmiId),
                name,
                type.dataType(),
                type.customTypeName(),
                visibility(plainAttr(property, "visibility")),
                nullable,
                identifier
        );
    }

    private TypeMapping resolveAttributeType(Element property, ImportContext context) {
        String reference = plainAttr(property, "type");
        if (reference.isBlank()) {
            Element typeChild = firstChild(property, "type");
            if (typeChild != null) {
                reference = xmiAttr(typeChild, "idref");
                if (reference.isBlank()) {
                    String href = typeChild.getAttribute("href");
                    if (!href.isBlank()) {
                        reference = href.contains("#") ? href.substring(href.lastIndexOf('#') + 1) : href;
                    }
                }
            }
        }

        String typeName = context.typeNames.getOrDefault(reference, reference);
        if (typeName == null || typeName.isBlank()) {
            typeName = "String";
        }
        return mapType(typeName);
    }

    private List<com.classforge.project.domain.document.UmlMethod> importMethods(Element classifier, ImportContext context) {
        List<com.classforge.project.domain.document.UmlMethod> methods = new ArrayList<>();
        for (Element operation : childElements(classifier)) {
            if (!is(operation, "ownedOperation")) continue;
            String returnType = "void";
            boolean hasReturn = false;
            List<com.classforge.project.domain.document.UmlMethod.Parameter> parameters = new ArrayList<>();
            for (Element parameter : childElements(operation)) {
                if (!is(parameter, "ownedParameter")) continue;
                String direction = plainAttr(parameter, "direction");
                String reference = plainAttr(parameter, "type");
                if (reference.isBlank()) {
                    Element type = firstChild(parameter, "type");
                    if (type != null) {
                        reference = xmiAttr(type, "idref");
                        if (reference.isBlank()) reference = plainAttr(type, "href");
                        if (reference.contains("#")) reference = reference.substring(reference.lastIndexOf('#') + 1);
                    }
                }
                String type = context.typeNames.getOrDefault(reference, reference);
                if (type.isBlank()) throw invalid("XMI_METHOD_TYPE_MISSING", "Un parámetro de método no tiene tipo.");
                if ("return".equals(direction)) {
                    if (hasReturn) throw invalid("XMI_METHOD_RETURNS", "Solo se admite un retorno por método.");
                    hasReturn = true; returnType = type;
                } else if (direction.isBlank() || "in".equals(direction)) {
                    parameters.add(new com.classforge.project.domain.document.UmlMethod.Parameter(requiredName(parameter, "Parameter"), type));
                } else throw invalid("XMI_METHOD_DIRECTION", "Los métodos admiten parámetros de entrada; no se admiten out/inout.");
            }
            methods.add(new com.classforge.project.domain.document.UmlMethod(stableUuid(requiredXmiId(operation, "Operation")),
                requiredName(operation, "Operation"), visibility(plainAttr(operation, "visibility")), returnType, parameters));
        }
        return methods;
    }

    private List<UmlRelationship> importRelationships(ImportContext context) {
        List<UmlRelationship> result = new ArrayList<>();
        for (Element association : context.associationElements) {
            String associationId = requiredXmiId(association, "Association");
            List<Element> ends = associationEnds(association, context);
            if (ends.size() != 2) {
                throw invalid(
                        "XMI_ASSOCIATION_ENDS_INVALID",
                        "La asociacion " + associationId + " debe tener exactamente dos extremos; encontrados: " + ends.size() + "."
                );
            }

            AssociationEnd first = associationEnd(ends.get(0), context);
            AssociationEnd second = associationEnd(ends.get(1), context);
            if (first.classId().equals(second.classId())) {
                // Self associations are supported; keep ordering deterministic.
            }

            int aggregateIndex = aggregationRank(first.aggregation()) > 0 ? 0 : aggregationRank(second.aggregation()) > 0 ? 1 : -1;
            if (aggregationRank(first.aggregation()) > 0 && aggregationRank(second.aggregation()) > 0) {
                throw invalid("XMI_ASSOCIATION_AGGREGATION_INVALID", "Una asociacion no puede declarar agregacion/composicion en ambos extremos.");
            }

            AssociationEnd source = aggregateIndex == 1 ? second : first;
            AssociationEnd target = aggregateIndex == 1 ? first : second;
            UmlRelationshipType relationshipType = switch (source.aggregation().toLowerCase(Locale.ROOT)) {
                case "composite" -> UmlRelationshipType.COMPOSITION;
                case "shared" -> UmlRelationshipType.AGGREGATION;
                default -> UmlRelationshipType.ASSOCIATION;
            };

            result.add(new UmlRelationship(
                    stableUuid(associationId),
                    source.classId(),
                    target.classId(),
                    relationshipType,
                    source.multiplicity(),
                    target.multiplicity()
            ));
        }
        return result;
    }

    private List<UmlRelationship> importGeneralizations(ImportContext context) {
        List<UmlRelationship> result = new ArrayList<>();
        for (Element classElement : context.classElements) {
            String sourceXmiId = requiredXmiId(classElement, "Class");
            UUID sourceId = context.classIds.get(sourceXmiId);
            for (Element child : childElements(classElement)) {
                if (!is(child, "generalization")) {
                    continue;
                }
                String general = plainAttr(child, "general");
                if (general.isBlank()) {
                    Element generalChild = firstChild(child, "general");
                    if (generalChild != null) {
                        general = xmiAttr(generalChild, "idref");
                    }
                }
                UUID targetId = context.classIds.get(general);
                if (targetId == null) {
                    throw invalid("XMI_GENERALIZATION_TARGET_MISSING", "La generalizacion de " + sourceXmiId + " referencia una clase no importada: " + general + ".");
                }
                String relationXmiId = xmiAttr(child, "id");
                if (relationXmiId.isBlank()) {
                    relationXmiId = "generalization:" + sourceXmiId + ":" + general;
                }
                result.add(new UmlRelationship(
                        stableUuid(relationXmiId),
                        sourceId,
                        targetId,
                        UmlRelationshipType.GENERALIZATION,
                        null,
                        null
                ));
            }
        }
        return result;
    }

    private List<Element> associationEnds(Element association, ImportContext context) {
        LinkedHashSet<Element> ordered = new LinkedHashSet<>();
        String memberEndAttribute = association.getAttribute("memberEnd");
        if (!memberEndAttribute.isBlank()) {
            for (String id : memberEndAttribute.trim().split("\\s+")) {
                Element end = context.propertiesById.get(id);
                if (end != null) {
                    ordered.add(end);
                }
            }
        }
        for (Element child : childElements(association)) {
            if (is(child, "memberEnd")) {
                String id = xmiAttr(child, "idref");
                Element end = context.propertiesById.get(id);
                if (end != null) {
                    ordered.add(end);
                }
            }
        }
        for (Element child : childElements(association)) {
            if (is(child, "ownedEnd")) {
                ordered.add(child);
            }
        }
        for (Element classElement : context.classElements) {
            for (Element property : childElements(classElement)) {
                if (is(property, "ownedAttribute") && requiredOrBlank(property, "association").equals(xmiAttr(association, "id"))) {
                    ordered.add(property);
                }
            }
        }
        return List.copyOf(ordered);
    }

    private AssociationEnd associationEnd(Element property, ImportContext context) {
        String typeRef = plainAttr(property, "type");
        if (typeRef.isBlank()) {
            Element type = firstChild(property, "type");
            if (type != null) {
                typeRef = xmiAttr(type, "idref");
                if (typeRef.isBlank()) {
                    String href = type.getAttribute("href");
                    if (!href.isBlank() && href.contains("#")) {
                        typeRef = href.substring(href.lastIndexOf('#') + 1);
                    }
                }
            }
        }
        UUID classId = context.classIds.get(typeRef);
        if (classId == null) {
            throw invalid("XMI_ASSOCIATION_CLASS_MISSING", "Un extremo de asociacion referencia una clase no importada: " + typeRef + ".");
        }
        return new AssociationEnd(
                classId,
                multiplicity(property),
                plainAttr(property, "aggregation")
        );
    }

    private Multiplicity multiplicity(Element property) {
        int lower = parseBound(boundValue(property, "lowerValue"), 1, false);
        Integer upper = parseUpper(boundValue(property, "upperValue"));
        if (upper != null && upper < lower) {
            throw invalid("XMI_MULTIPLICITY_INVALID", "La multiplicidad XMI tiene upper menor que lower.");
        }
        return new Multiplicity(lower, upper);
    }

    private String boundValue(Element property, String childName) {
        String direct = property.getAttribute(childName.equals("lowerValue") ? "lower" : "upper");
        if (!direct.isBlank()) {
            return direct;
        }
        Element child = firstChild(property, childName);
        if (child == null) {
            return "";
        }
        return child.getAttribute("value");
    }

    private int parseBound(String value, int defaultValue, boolean unlimited) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        if (unlimited && ("*".equals(value) || "-1".equals(value))) {
            return -1;
        }
        try {
            int parsed = Integer.parseInt(value);
            if (parsed < 0) {
                throw invalid("XMI_MULTIPLICITY_INVALID", "La multiplicidad inferior no puede ser negativa.");
            }
            return parsed;
        } catch (NumberFormatException exception) {
            throw invalid("XMI_MULTIPLICITY_INVALID", "Valor de multiplicidad no numerico: " + value + ".", exception);
        }
    }

    private Integer parseUpper(String value) {
        if (value == null || value.isBlank()) {
            return 1;
        }
        if ("*".equals(value) || "-1".equals(value)) {
            return null;
        }
        return parseBound(value, 1, false);
    }

    private UmlVisibility visibility(String value) {
        return switch (value == null ? "" : value.toLowerCase(Locale.ROOT)) {
            case "public" -> UmlVisibility.PUBLIC;
            case "protected" -> UmlVisibility.PROTECTED;
            case "package", "package_private" -> UmlVisibility.PACKAGE;
            default -> UmlVisibility.PRIVATE;
        };
    }

    private TypeMapping mapType(String raw) {
        String simple = raw;
        if (simple.contains("#")) {
            simple = simple.substring(simple.lastIndexOf('#') + 1);
        }
        String normalized = simple.replaceAll("[^A-Za-z0-9]", "").toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "string", "char", "varchar", "text", "eajavastring" -> new TypeMapping(UmlDataType.STRING, null);
            case "integer", "int", "short", "eajavaint", "eajavainteger" -> new TypeMapping(UmlDataType.INTEGER, null);
            case "long", "longinteger" -> new TypeMapping(UmlDataType.LONG, null);
            case "decimal", "double", "float", "real", "bigdecimal", "eajavadecimal" -> new TypeMapping(UmlDataType.DECIMAL, null);
            case "boolean", "bool" -> new TypeMapping(UmlDataType.BOOLEAN, null);
            case "date", "localdate", "eajavadate" -> new TypeMapping(UmlDataType.DATE, null);
            case "datetime", "timestamp", "localdatetime" -> new TypeMapping(UmlDataType.DATETIME, null);
            case "uuid", "guid" -> new TypeMapping(UmlDataType.UUID, null);
            default -> new TypeMapping(UmlDataType.CUSTOM, simple);
        };
    }

    static UUID stableUuid(String xmiId) {
        Matcher matcher = EA_UUID.matcher(xmiId == null ? "" : xmiId.trim());
        if (matcher.matches()) {
            String raw = matcher.group(1).toLowerCase(Locale.ROOT);
            return UUID.fromString(raw.substring(0, 8) + "-" + raw.substring(8, 12) + "-" + raw.substring(12, 16) + "-" + raw.substring(16, 20) + "-" + raw.substring(20));
        }
        return UUID.nameUUIDFromBytes(("classforge:xmi:" + xmiId).getBytes(StandardCharsets.UTF_8));
    }

    private String requiredXmiId(Element element, String kind) {
        String id = xmiAttr(element, "id");
        if (id.isBlank()) {
            throw invalid("XMI_ID_REQUIRED", kind + " sin xmi:id.");
        }
        return id;
    }

    private String requiredName(Element element, String kind) {
        String name = element.getAttribute("name");
        if (name == null || name.isBlank()) {
            throw invalid("XMI_NAME_REQUIRED", kind + " sin name.");
        }
        return name.trim();
    }

    private String requiredOrBlank(Element element, String name) {
        return element.hasAttribute(name) ? element.getAttribute(name) : "";
    }

    private String xmiType(Element element) {
        return xmiAttr(element, "type");
    }

    private String attrAny(Element element, String... names) {
        for (String name : names) {
            String value = plainAttr(element, name);
            if (!value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private String plainAttr(Element element, String name) {
        return element.getAttribute(name);
    }

    private String xmiAttr(Element element, String localName) {
        String value = element.getAttributeNS("http://schema.omg.org/spec/XMI/2.1", localName);
        if (!value.isBlank()) {
            return value;
        }
        value = element.getAttributeNS("http://www.omg.org/XMI", localName);
        if (!value.isBlank()) {
            return value;
        }
        value = element.getAttribute("xmi:" + localName);
        if (!value.isBlank()) {
            return value;
        }
        return "";
    }

    private boolean truthy(String value) {
        return "true".equalsIgnoreCase(value) || "1".equals(value);
    }

    private int aggregationRank(String value) {
        return switch (value == null ? "" : value.toLowerCase(Locale.ROOT)) {
            case "composite" -> 2;
            case "shared" -> 1;
            default -> 0;
        };
    }

    private boolean is(Element element, String localName) {
        String local = element.getLocalName();
        if (local != null) {
            return localName.equals(local);
        }
        String name = element.getNodeName();
        int colon = name.indexOf(':');
        return localName.equals(colon >= 0 ? name.substring(colon + 1) : name);
    }

    private List<Element> childElements(Element parent) {
        List<Element> result = new ArrayList<>();
        NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node node = children.item(i);
            if (node instanceof Element element) {
                result.add(element);
            }
        }
        return result;
    }

    private List<Element> descendants(Element parent, String localName) {
        List<Element> result = new ArrayList<>();
        for (Element child : childElements(parent)) {
            if (is(child, localName)) {
                result.add(child);
            }
            result.addAll(descendants(child, localName));
        }
        return result;
    }

    private Element firstChild(Element parent, String localName) {
        for (Element child : childElements(parent)) {
            if (is(child, localName)) {
                return child;
            }
        }
        return null;
    }

    private XmiInterchangeException invalid(String code, String message) {
        return new XmiInterchangeException(code, message);
    }

    private XmiInterchangeException invalid(String code, String message, Throwable cause) {
        return new XmiInterchangeException(code, message, cause);
    }

    private record TypeMapping(UmlDataType dataType, String customTypeName) {
    }

    private record AssociationEnd(UUID classId, Multiplicity multiplicity, String aggregation) {
        AssociationEnd {
            aggregation = aggregation == null ? "" : aggregation;
        }
    }

    private static final class ImportContext {
        private final List<Element> classElements = new ArrayList<>();
        private final List<Element> associationClassElements = new ArrayList<>();
        private final List<Element> associationElements = new ArrayList<>();
        private final List<Element> dataTypeElements = new ArrayList<>();
        private final Map<String, String> typeNames = new LinkedHashMap<>();
        private final Map<String, UUID> classIds = new LinkedHashMap<>();
        private final Map<String, String> classNames = new LinkedHashMap<>();
        private final Map<String, Element> propertiesById = new HashMap<>();
        private final Set<String> enterpriseAssociationClassIds = new HashSet<>();
        private final List<XmiDiagnostic> diagnostics = new ArrayList<>();
        private int packageCount;
        private int unsupportedElements;
    }
}
