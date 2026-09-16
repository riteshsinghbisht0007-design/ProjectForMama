const fs = require('fs');

let content = fs.readFileSync('src/context/SummonContext.tsx', 'utf8');

const oldWitnessAdd = `    setWitnesses((prev) => {
      const updated = [newWitness, ...prev.filter((w) => w.id !== witnessId)];
      return updated;
    });

    // Save to DB
    fetch('/api/witnesses', {
      method: 'POST',
      credentials: 'include',
        headers: {
        'Content-Type': 'application/json',
        
      },
      body: JSON.stringify(newWitness)
    }).catch(err => console.error("Failed to save witness to DB:", err));

    return newWitness;`;

const newWitnessAdd = `    try {
      const response = await fetch('/api/witnesses', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newWitness)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save witness to database');
      }
      
      const savedWitness = await response.json();
      
      setWitnesses((prev) => {
        const updated = [savedWitness, ...prev.filter((w) => w.id !== witnessId)];
        return updated;
      });
      
      return savedWitness;
    } catch (err) {
      console.error("Failed to save witness to DB:", err);
      throw err;
    }`;

content = content.replace(oldWitnessAdd, newWitnessAdd);

const oldWitnessUpdate = `    setWitnesses((prev) => {
      const updated = prev.map((w) => (w.id === id ? { ...w, ...updatedRecord } : w));
      return updated;
    });

    // Save to DB
    fetch(\`/api/witnesses/\${id}\`, {
      method: 'PUT',
      credentials: 'include',
        headers: {
        'Content-Type': 'application/json',
        
      },
      body: JSON.stringify(updatedRecord)
    }).catch(err => console.error("Failed to update witness in DB:", err));`;

const newWitnessUpdate = `    try {
      const response = await fetch(\`/api/witnesses/\${id}\`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRecord)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update witness in database');
      }

      setWitnesses((prev) => {
        const updated = prev.map((w) => (w.id === id ? { ...w, ...updatedRecord } : w));
        return updated;
      });
    } catch (err) {
      console.error("Failed to update witness in DB:", err);
      throw err;
    }`;

content = content.replace(oldWitnessUpdate, newWitnessUpdate);

const oldWitnessDelete = `    setWitnesses((prev) => {
      const updated = prev.filter((w) => w.id !== id);
      return updated;
    });

    // Delete from DB
    fetch(\`/api/witnesses/\${id}\`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(err => console.error("Failed to delete witness from DB:", err));`;

const newWitnessDelete = `    try {
      const response = await fetch(\`/api/witnesses/\${id}\`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete witness from database');
      }

      setWitnesses((prev) => {
        const updated = prev.filter((w) => w.id !== id);
        return updated;
      });
    } catch (err) {
      console.error("Failed to delete witness from DB:", err);
      throw err;
    }`;

content = content.replace(oldWitnessDelete, newWitnessDelete);

fs.writeFileSync('src/context/SummonContext.tsx', content);
