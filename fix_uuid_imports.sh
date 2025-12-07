#!/bin/bash

# Script to replace uuid imports with graceful dependency loader

FILES=(
  "src/features/common/services/knowledgeOrganizerService.js"
  "src/features/common/services/externalDataService.js"
  "src/features/common/services/ragService.js"
  "src/features/common/services/documentService.js"
  "src/features/common/services/indexingService.js"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."

    # Replace uuid import with dependency loader
    sed -i "s/const { v4: uuidv4 } = require('uuid');/const { loaders } = require('..\/utils\/dependencyLoader');\nconst uuid = loaders.loadUuid();\nconst uuidv4 = uuid.v4;/" "$file"

    echo "✅ $file updated"
  else
    echo "⚠️  $file not found, skipping"
  fi
done

echo ""
echo "🎉 All UUID imports updated!"
