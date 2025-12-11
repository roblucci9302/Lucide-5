#!/usr/bin/env python3
"""
Script pour compléter les modifications de diarisation unifiée
Modifie les sections critiques du sttService.js
"""

import re

# Lire le fichier
with open('/Users/robespierreganro/Desktop/Lucide-6-main/src/features/listen/stt/sttService.js', 'r') as f:
    lines = f.readlines()

# Supprimer l'ancien handleTheirMessage et remplacer par la version unifiée Deepgram
# On cherche la ligne qui commence handleTheirMessage et on la remplace

new_content = []
skip_mode = False
in_handle_their = False
handle_my_done = False

for i, line in enumerate(lines):
    # Détecter le début de handleTheirMessage
    if 'const handleTheirMessage = message =>' in line:
        in_handle_their = True
        skip_mode = True
        continue
    
    # Détecter la fin de handleTheirMessage (avant const mySttConfig)
    if in_handle_their and 'const mySttConfig' in line:
        skip_mode = False
        in_handle_their = False
    
    if not skip_mode:
        new_content.append(line)

# Écrire le fichier modifié
with open('/Users/robespierreganro/Desktop/Lucide-6-main/src/features/listen/stt/sttService.js', 'w') as f:
    f.writelines(new_content)

print("✅ handleTheirMessage supprimé")
