#!/usr/bin/env python3
"""
Script pour appliquer les modifications de diarisation unifiée au sttService.js
Ce script effectue des remplacements complexes de texte de manière automatisée
"""

import re

# Lire le fichier
with open('/Users/robespierreganro/Desktop/Lucide-6-main/src/features/listen/stt/sttService.js', 'r') as f:
    content = f.read()

# 1. Remplacer tous les appels à debounceMyCompletion et debounceTheirCompletion
content = re.sub(r'this\.debounceMyCompletion\(', 'this.debounceCompletion(', content)
content = re.sub(r'this\.debounceTheirCompletion\(', 'this.debounceCompletion(', content)

# 2. Remplacer les références aux buffers
content = re.sub(r'this\.myCompletionBuffer', 'this.completionBuffer', content)
content = re.sub(r'this\.theirCompletionBuffer', 'this.completionBuffer', content)

# 3. Remplacer les références aux timers
content = re.sub(r'this\.myCompletionTimer', 'this.completionTimer', content)
content = re.sub(r'this\.theirCompletionTimer', 'this.completionTimer', content)

# 4. Remplacer les références aux utterances
content = re.sub(r'this\.myCurrentUtterance', 'this.currentUtterance', content)
content = re.sub(r'this\.theirCurrentUtterance', 'this.currentUtterance', content)

# 5. Remplacer flushMyCompletion et flushTheirCompletion
content = re.sub(r'this\.flushMyCompletion\(\)', 'this.flushCompletion()', content)
content = re.sub(r'this\.flushTheirCompletion\(\)', 'this.flushCompletion()', content)

print("✅ Remplacements effectués")

# Sauvegarder
with open('/Users/robespierreganro/Desktop/Lucide-6-main/src/features/listen/stt/sttService.js', 'w') as f:
    f.write(content)

print("✅ Fichier sauvegardé")
