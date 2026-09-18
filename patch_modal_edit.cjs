const fs = require('fs');
let code = fs.readFileSync('src/components/SummonDetailModal.tsx', 'utf8');

const targetUnsaved = "  const hasUnsavedChanges = () => {";
const replacementUnsaved = `  const hasUnsavedChanges = () => {
    if (editRawFile !== null) return true;
    if (removeImage) return true;`;
code = code.replace(targetUnsaved, replacementUnsaved);

const targetStartEdit = `  const handleStartEdit = () => {
    setEditPersonName(summon.personName);
    setEditFatherName(summon.fatherName || '');
    setEditAddress(summon.address);
    setEditHearingDate(summon.hearingDate);
    setEditCourtName(summon.courtName);
    setEditCourtAddress(summon.courtAddress);
    setEditOffense(summon.offenseCharges || '');
    setEditUrgency(summon.urgency);
    setIsEditing(true);
  };`;
const replacementStartEdit = `  const handleStartEdit = () => {
    setEditPersonName(summon.personName);
    setEditFatherName(summon.fatherName || '');
    setEditAddress(summon.address);
    setEditHearingDate(summon.hearingDate);
    setEditCourtName(summon.courtName);
    setEditCourtAddress(summon.courtAddress);
    setEditOffense(summon.offenseCharges || '');
    setEditUrgency(summon.urgency);
    setEditRawFile(null);
    setEditAttachmentPreview(null);
    setEditFileName('');
    setRemoveImage(false);
    setIsEditing(true);
  };`;
code = code.replace(targetStartEdit, replacementStartEdit);

const targetSaveEdit = `  const handleSaveEdit = async () => {
    try {
      await updateSummon(summon.id, {
        personName: editPersonName.trim(),
        fatherName: editFatherName.trim() || undefined,
        address: editAddress.trim(),
        hearingDate: editHearingDate,
        courtName: editCourtName.trim(),
        courtAddress: editCourtAddress.trim(),
        offenseCharges: editOffense.trim(),
        urgency: editUrgency,
      });
      setIsEditing(false);`;
const replacementSaveEdit = `  const handleSaveEdit = async () => {
    try {
      let updates: any = {
        personName: editPersonName.trim(),
        fatherName: editFatherName.trim() || undefined,
        address: editAddress.trim(),
        hearingDate: editHearingDate,
        courtName: editCourtName.trim(),
        courtAddress: editCourtAddress.trim(),
        offenseCharges: editOffense.trim(),
        urgency: editUrgency,
      };
      if (removeImage) updates.imageUrl = '';
      
      await updateSummon(summon.id, updates, editRawFile, editFileName);
      setEditRawFile(null);
      setRemoveImage(false);
      setIsEditing(false);`;
code = code.replace(targetSaveEdit, replacementSaveEdit);

const targetAutoSave = `      try {
        await updateSummon(summon.id, {
          personName: editPersonName.trim(),
          fatherName: editFatherName.trim() || undefined,
          address: editAddress.trim(),
          hearingDate: editHearingDate,
          courtName: editCourtName.trim(),
          courtAddress: editCourtAddress.trim(),
          offenseCharges: editOffense.trim(),
          urgency: editUrgency,
        });
        setSaveStatus('saved');`;
const replacementAutoSave = `      try {
        let updates: any = {
          personName: editPersonName.trim(),
          fatherName: editFatherName.trim() || undefined,
          address: editAddress.trim(),
          hearingDate: editHearingDate,
          courtName: editCourtName.trim(),
          courtAddress: editCourtAddress.trim(),
          offenseCharges: editOffense.trim(),
          urgency: editUrgency,
        };
        if (removeImage) updates.imageUrl = '';
        
        await updateSummon(summon.id, updates, editRawFile, editFileName);
        
        setEditRawFile(null);
        setRemoveImage(false);
        setSaveStatus('saved');`;
code = code.replace(targetAutoSave, replacementAutoSave);

fs.writeFileSync('src/components/SummonDetailModal.tsx', code);
console.log("Patched SummonDetailModal edit logic");
