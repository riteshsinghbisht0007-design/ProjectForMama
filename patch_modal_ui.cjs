const fs = require('fs');
let code = fs.readFileSync('src/components/SummonDetailModal.tsx', 'utf8');

const targetImage = `          {/* DOCUMENT ATTACHMENTS (IMAGE OR PDF) */}
          {summon.imageUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary-text uppercase tracking-wider font-mono">
                  Official Document / Warrant Scan
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Preserved in encrypted cloud vault
                </span>
              </div>
              <div className="border border-border rounded-xl overflow-hidden bg-black/40 p-2 flex justify-center">
                <img
                  src={summon.imageUrl}
                  alt="Summon document copy"
                  className="max-h-72 object-contain rounded-lg border border-border-strong"
                />
              </div>
            </div>
          )}`;

const replacementImage = `          {/* DOCUMENT ATTACHMENTS (IMAGE OR PDF) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary-text uppercase tracking-wider font-mono">
                Official Document / Warrant Scan
              </span>
              {!isEditing && summon.imageUrl && (
                <span className="text-[11px] text-muted-foreground">
                  Preserved in encrypted cloud vault
                </span>
              )}
            </div>
            {isEditing ? (
              <div className="border border-border border-dashed rounded-xl overflow-hidden bg-black/20 p-4 flex flex-col items-center justify-center space-y-3">
                {(!removeImage && (editAttachmentPreview || summon.imageUrl)) ? (
                  <>
                    <img
                      src={editAttachmentPreview || summon.imageUrl}
                      alt="Summon document copy"
                      className="max-h-48 object-contain rounded-lg border border-border-strong"
                    />
                    <div className="flex items-center gap-3">
                      <label htmlFor="edit-replace-photo" className="px-3 py-1.5 rounded-lg bg-muted hover:bg-border text-xs cursor-pointer transition-colors">
                        <input id="edit-replace-photo" type="file" accept="image/*" onChange={handleEditImageUpload} className="hidden" />
                        Replace Photo
                      </label>
                      <button onClick={() => setRemoveImage(true)} className="px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-950/30 text-xs transition-colors">
                        Remove Photo
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-muted rounded-full text-muted-foreground">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-muted-foreground">No summons photo attached</span>
                    <label htmlFor="edit-add-photo" className="px-3 py-1.5 rounded-lg bg-primary-btn hover:bg-primary-hover text-white text-xs cursor-pointer transition-colors mt-2">
                      <input id="edit-add-photo" type="file" accept="image/*" capture="environment" onChange={handleEditImageUpload} className="hidden" />
                      Add Photo
                    </label>
                  </>
                )}
              </div>
            ) : (
              summon.imageUrl ? (
                <div className="border border-border rounded-xl overflow-hidden bg-black/40 p-2 flex flex-col items-center">
                  <img
                    src={summon.imageUrl}
                    alt="Summon document copy"
                    className="max-h-72 object-contain rounded-lg border border-border-strong mb-2 cursor-pointer"
                    onClick={() => setIsFullImageOpen(true)}
                  />
                  <button onClick={() => setIsFullImageOpen(true)} className="text-[11px] text-cyan-400 hover:underline mb-1">
                    View Full Image
                  </button>
                </div>
              ) : (
                <div className="border border-border border-dashed rounded-xl overflow-hidden bg-black/20 p-6 flex flex-col items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground mb-2 opacity-50" />
                  <span className="text-xs text-muted-foreground">No summons photo attached</span>
                </div>
              )
            )}
          </div>
          
          {/* Full Image Modal */}
          {isFullImageOpen && summon?.imageUrl && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/90 backdrop-blur-sm" onClick={() => setIsFullImageOpen(false)}>
              <div className="relative max-w-5xl w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setIsFullImageOpen(false)} className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black text-white rounded-full transition-colors z-10">
                  <X className="w-6 h-6" />
                </button>
                <img src={summon.imageUrl} alt="Full Summons Photo" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
              </div>
            </div>
          )}`;

code = code.replace(targetImage, replacementImage);

fs.writeFileSync('src/components/SummonDetailModal.tsx', code);
console.log("Patched SummonDetailModal image UI");
