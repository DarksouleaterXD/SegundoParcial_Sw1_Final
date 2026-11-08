package com.classforge.assistant.context;
public interface AssistantQuestionGateway {
    String answer(String system, String contextAndQuestion);
    default String answer(String system, String prompt, String provider) { return answer(system, prompt); }
}
