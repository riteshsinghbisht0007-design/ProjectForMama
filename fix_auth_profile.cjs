const fs = require('fs');
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

const updatedUpdateProfile = `
  const updateOfficerProfile = async (updates: Partial<OfficerUser>) => {
    if (!currentUser) return;
    
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update profile');
      }
      
      const data = await response.json();
      setCurrentUser(data.user);
    } catch (err: any) {
      console.error("Profile update error:", err);
      throw err;
    }
  };
`;

content = content.replace(
  /const updateOfficerProfile = async \(updates: Partial<OfficerUser>\) => \{[\s\S]*?setCurrentUser\(\{ \.\.\.currentUser, \.\.\.updates \}\);\n  \};/,
  updatedUpdateProfile.trim()
);

fs.writeFileSync('src/context/AuthContext.tsx', content);

