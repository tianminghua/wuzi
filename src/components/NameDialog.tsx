import React, { useState } from 'react';
import './NameDialog.css';

interface NameDialogProps {
  onSubmit: (name: string) => void;
}

const NameDialog: React.FC<NameDialogProps> = ({ onSubmit }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <h2>Welcome!</h2>
        <p>Please enter your name to continue:</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
          />
          <button type="submit" disabled={!name.trim()}>
            Join
          </button>
        </form>
      </div>
    </div>
  );
};

export default NameDialog; 