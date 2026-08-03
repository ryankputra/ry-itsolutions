const fs = require('fs');
let c = fs.readFileSync('src/app/(main)/admin/page.tsx', 'utf8');

const target = `                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modal Top Up Ceirgo */}`;

const newTarget = `                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modal Top Up Ceirgo */}`;

c = c.replace(target, newTarget);

// Also check if there's any stray parentheses
c = c.replace('                )))}', '                ))}');

fs.writeFileSync('src/app/(main)/admin/page.tsx', c);
