const fs = require('fs');
let code = fs.readFileSync('src/components/AddSummonModal.tsx', 'utf8');

const target = "              {/* Action Buttons */}";
const newSection = `
              {/* SECTION D: SUMMONS PHOTO (OPTIONAL) */}
              <div className="space-y-3 backdrop-blur-md bg-card/80 border border-white/5 shadow-sm hover:border-cyan-500/30 transition-all duration-300 rounded-2xl p-4 sm:p-5">
                <span className="text-xs font-bold text-primary-text uppercase tracking-wider font-mono flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-warning" />
                  D. Summons Photo (Optional)
                </span>
                
                {attachmentPreview && attachmentType === 'image' ? (
                  <div className="space-y-3">
                    <div className="relative aspect-video max-h-48 bg-black rounded-xl overflow-hidden border border-border flex items-center justify-center">
                      <img src={attachmentPreview} alt="Summons Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <label
                        htmlFor="manual-replace-photo"
                        className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-[11px] font-medium cursor-pointer transition-colors"
                      >
                        <input
                          id="manual-replace-photo"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        Replace Photo
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentPreview(null);
                          setRawFile(null);
                          setAttachmentType(null);
                          setFileName('');
                        }}
                        className="px-4 py-2 rounded-xl text-red-400 hover:bg-red-950/30 text-[11px] font-medium cursor-pointer transition-colors"
                      >
                        Remove Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-xl bg-background/50">
                    <div className="p-3 rounded-full bg-muted text-muted-foreground mb-3">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center max-w-[250px] mb-4">
                      Optionally attach a clear photo of the original summons for future reference.
                    </p>
                    <label
                      htmlFor="manual-add-photo"
                      className="px-5 py-2 rounded-xl bg-primary-btn text-white hover:bg-primary-hover text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                    >
                      <input
                        id="manual-add-photo"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Plus className="w-4 h-4" />
                      Add Photo
                    </label>
                  </div>
                )}
              </div>

              {/* Action Buttons */}`;

code = code.replace(target, newSection);
fs.writeFileSync('src/components/AddSummonModal.tsx', code);
console.log("Patched AddSummonModal.tsx");
