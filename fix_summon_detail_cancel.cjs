const fs = require('fs');

let content = fs.readFileSync('src/components/SummonDetailModal.tsx', 'utf8');

const hasChangesFunc = `
  const hasUnsavedChanges = () => {
    if (!isEditing) return false;
    if (editPersonName !== summon.personName) return true;
    if (editFatherName !== (summon.fatherName || '')) return true;
    if (editAddress !== summon.address) return true;
    if (editHearingDate !== summon.hearingDate) return true;
    if (editCourtName !== summon.courtName) return true;
    if (editCourtAddress !== summon.courtAddress) return true;
    if (editOffense !== (summon.offenseCharges || '')) return true;
    if (editUrgency !== summon.urgency) return true;
    return false;
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      if (window.confirm("You have unsaved changes. Discard them?")) {
        setIsEditing(false);
        onClose();
      }
    } else {
      setIsEditing(false);
      onClose();
    }
  };
`;

if (!content.includes('hasUnsavedChanges()')) {
  content = content.replace(
    "const handleStartEdit = () => {",
    hasChangesFunc + "\n  const handleStartEdit = () => {"
  );
  
  // Replace onClick={onClose} with onClick={handleClose}
  content = content.replace(
    "onClick={onClose}",
    "onClick={handleClose}"
  );

  // Add a cancel edit button next to Save Changes
  content = content.replace(
    /<button\s*onClick=\{handleSaveEdit\}[\s\S]*?<\/button>/,
    `$&
                <button
                  onClick={() => {
                    if (hasUnsavedChanges()) {
                      if (window.confirm("You have unsaved changes. Discard them?")) setIsEditing(false);
                    } else {
                      setIsEditing(false);
                    }
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1 font-bold cursor-pointer ml-3"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>`
  );

  fs.writeFileSync('src/components/SummonDetailModal.tsx', content);
}
