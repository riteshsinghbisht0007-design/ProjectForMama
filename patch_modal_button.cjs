const fs = require('fs');
let code = fs.readFileSync('src/components/AddSummonModal.tsx', 'utf8');

const oldButtonBlock = `                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Summons</span>
                      </>
                    )}`;

const newButtonBlock = `                    {saveSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Saved ✓</span>
                      </>
                    ) : isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Summons</span>
                      </>
                    )}`;

code = code.replace(oldButtonBlock, newButtonBlock);
fs.writeFileSync('src/components/AddSummonModal.tsx', code);
