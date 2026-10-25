import React from 'react';
import { BookOpen, Clock, HeartHandshake, Sparkles, Brain } from 'lucide-react';

const TOPICS = [
  {
    icon: BookOpen,
    label: "Study Schedule",
    prompt: "Can you help me design a balanced, realistic study timetable for my upcoming exams?",
  },
  {
    icon: Clock,
    label: "Beat Procrastination",
    prompt: "I keep putting off studying for a big assignment. How can I get started right now?",
  },
  {
    icon: HeartHandshake,
    label: "Exam Anxiety",
    prompt: "I feel intense pressure and nervous anxiety before exams. What are some healthy calming techniques?",
  },
  {
    icon: Brain,
    label: "Pomodoro Technique",
    prompt: "How does the Pomodoro technique work, and how can I adapt it for college coursework?",
  },
];

export default function SuggestedTopics({ onSelectPrompt, disabled }) {
  return (
    <div className="suggested-topics-container">
      <div className="suggested-header">
        <Sparkles size={14} className="text-violet-400" />
        <span>Suggested Student Support Topics:</span>
      </div>
      <div className="topics-pills">
        {TOPICS.map((topic, i) => {
          const Icon = topic.icon;
          return (
            <button
              key={i}
              type="button"
              className="topic-pill"
              onClick={() => onSelectPrompt(topic.prompt)}
              disabled={disabled}
            >
              <Icon size={14} />
              <span>{topic.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
