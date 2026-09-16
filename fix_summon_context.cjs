const fs = require('fs');

let content = fs.readFileSync('src/context/SummonContext.tsx', 'utf8');

// We will replace addSummon, updateSummon, deleteSummon.

const oldAdd = `    // Save immediately and synchronously
    setSummons((prev) => {
      const updated = [newSummon, ...prev.filter((s) => s.id !== summonId)];
      return updated;
    });

    // Save to DB
    fetch('/api/summons', {
      method: 'POST',
      credentials: 'include',
        headers: {
        'Content-Type': 'application/json',
        
      },
      body: JSON.stringify(newSummon)
    }).catch(err => console.error("Failed to save summon to DB:", err));

    return newSummon;`;

const newAdd = `    // Save to DB first to ensure persistence
    try {
      const response = await fetch('/api/summons', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSummon)
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || \`Failed to save to database: \${response.statusText}\`);
      }
      
      const savedSummon = await response.json();
      
      // Save synchronously to local state only after DB success
      setSummons((prev) => {
        const updated = [savedSummon, ...prev.filter((s) => s.id !== summonId)];
        return updated;
      });
      
      return savedSummon;
    } catch (err) {
      console.error("Failed to save summon to DB:", err);
      throw err;
    }`;

content = content.replace(oldAdd, newAdd);

const oldUpdate = `    setSummons((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...updatedRecord } : s));
      return updated;
    });

    // Save to DB
    fetch(\`/api/summons/\${id}\`, {
      method: 'PUT',
      credentials: 'include',
        headers: {
        'Content-Type': 'application/json',
        
      },
      body: JSON.stringify(updatedRecord)
    }).catch(err => console.error("Failed to update summon in DB:", err));`;

const newUpdate = `    try {
      const response = await fetch(\`/api/summons/\${id}\`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRecord)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update summon in database');
      }

      setSummons((prev) => {
        const updated = prev.map((s) => (s.id === id ? { ...s, ...updatedRecord } : s));
        return updated;
      });
    } catch (err) {
      console.error("Failed to update summon in DB:", err);
      throw err;
    }`;

content = content.replace(oldUpdate, newUpdate);

const oldDelete = `    setSummons((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      return updated;
    });

    // Delete from DB
    fetch(\`/api/summons/\${id}\`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(err => console.error("Failed to delete summon from DB:", err));`;

const newDelete = `    try {
      const response = await fetch(\`/api/summons/\${id}\`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete summon from database');
      }

      setSummons((prev) => {
        const updated = prev.filter((s) => s.id !== id);
        return updated;
      });
    } catch (err) {
      console.error("Failed to delete summon from DB:", err);
      throw err;
    }`;

content = content.replace(oldDelete, newDelete);

fs.writeFileSync('src/context/SummonContext.tsx', content);
