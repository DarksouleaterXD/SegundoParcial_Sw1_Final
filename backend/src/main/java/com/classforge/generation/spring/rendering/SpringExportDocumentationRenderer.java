package com.classforge.generation.spring.rendering;

import com.classforge.generation.spring.application.SpringBootGenerationOptions;
import com.classforge.generation.spring.generated.*;
import com.classforge.project.domain.Project;
import com.classforge.project.domain.document.*;
import tools.jackson.databind.json.JsonMapper;
import java.nio.charset.StandardCharsets;
import java.util.*;

public final class SpringExportDocumentationRenderer {
    private final JsonMapper json = JsonMapper.builder().build();
    public record SourceModel(String schemaVersion, UUID projectId, long revision, ProjectDocument document) {}
    public record GenerationModel(String schemaVersion, boolean firstAttributeIdentifierFallback, UmlModel umlModel) {}
    public record ClassifierOperations(UUID id, String name, String kind, boolean implemented, List<UmlMethod> methods) {}
    public record OperationsCatalog(String schemaVersion, UUID projectId, long revision, String executionPolicy,
        List<ClassifierOperations> classifiers) {}

    public GeneratedProject enrich(GeneratedProject generated, Project source, UmlModel generationModel,
            SpringBootGenerationOptions options) {
        List<GeneratedFile> files = new ArrayList<>(generated.files());
        files.add(jsonFile("docs/source-model.json", new SourceModel("1.0", source.id(), source.revision(), source.document())));
        files.add(jsonFile("docs/generation-model.json", new GenerationModel("1.0", options.useFirstAttributeAsIdentifier(), generationModel)));
        List<ClassifierOperations> classifiers = new ArrayList<>();
        source.document().umlModel().classes().forEach(value -> classifiers.add(
            new ClassifierOperations(value.id(), value.name(), "CLASS", false, value.methods())));
        source.document().umlModel().associationClasses().forEach(value -> classifiers.add(
            new ClassifierOperations(value.id(), value.name(), "ASSOCIATION_CLASS", false, value.methods())));
        classifiers.sort(Comparator.comparing(value -> value.id().toString()));
        files.add(jsonFile("docs/uml-operations.json", new OperationsCatalog("1.0", source.id(), source.revision(),
            "DOCUMENTATION_ONLY_NO_BUSINESS_LOGIC_OR_HTTP_ENDPOINTS", classifiers)));
        return new GeneratedProject(generated.artifactName(), files);
    }
    private GeneratedFile jsonFile(String path, Object value) {
        return new GeneratedFile(path, GeneratedFileType.TEXT,
            SpringFreeMarkerRenderer.normalizeGeneratedText(json.writerWithDefaultPrettyPrinter().writeValueAsString(value))
                .getBytes(StandardCharsets.UTF_8));
    }
}
