import React from 'react';
import { LifeBuoy } from 'lucide-react';

export default function CrisisFooter() {
  return (
    <footer className="crisis-footer">
      <div className="crisis-content">
        <LifeBuoy size={14} className="text-violet-400" />
        <span>
          <strong>Student Safety Notice:</strong> MentaBot is an AI assistant and does not provide medical diagnoses or therapy.
          In a crisis or severe distress, please connect with a trusted adult, campus wellness center, or call/text <strong>988</strong> (USA/Canada) or your local emergency crisis lifeline.
        </span>
      </div>
    </footer>
  );
}
