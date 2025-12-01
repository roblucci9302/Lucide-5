/**
 * Download Checksums and Binary URLs Configuration
 *
 * Platform/Architecture Support:
 * - Windows: x64 binaries available
 * - Linux: x64 binaries available
 * - macOS: Use Homebrew (brew install whisper-cpp) - no standalone binaries
 *
 * Note: whisper.cpp does not provide pre-built macOS binaries.
 * On macOS, the service automatically installs via Homebrew which provides
 * native binaries for both Intel (x64) and Apple Silicon (arm64).
 */
const DOWNLOAD_CHECKSUMS = {
    ollama: {
        // Ollama provides universal binary for macOS (Intel + Apple Silicon)
        dmg: {
            url: 'https://ollama.com/download/Ollama.dmg',
            sha256: null, // Checksum verification skipped if null
            arch: 'universal' // Universal binary supports both x64 and arm64
        },
        exe: {
            url: 'https://ollama.com/download/OllamaSetup.exe',
            sha256: null,
            arch: 'x64'
        },
        linux: {
            url: 'curl -fsSL https://ollama.com/install.sh | sh',
            sha256: null,
            arch: 'x64' // Linux install script handles architecture
        }
    },
    whisper: {
        // Models are architecture-independent (same binary format)
        models: {
            'whisper-tiny': {
                url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-tiny.bin',
                sha256: 'be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21'
            },
            'whisper-base': {
                url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-base.bin',
                sha256: '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe'
            },
            'whisper-small': {
                url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-small.bin',
                sha256: '1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b'
            },
            'whisper-medium': {
                url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-medium.bin',
                sha256: '6c14d5adee5f86394037b4e4e8b59f1673b6cee10e3cf0b11bbdbee79c156208'
            }
        },
        // Binary executables (platform-specific)
        // Note: macOS uses Homebrew installation (native arm64/x64 support)
        binaries: {
            'v1.7.6': {
                // macOS: No pre-built binaries available from whisper.cpp releases
                // Use Homebrew: `brew install whisper-cpp`
                // Homebrew provides native binaries for both Intel and Apple Silicon
                mac: {
                    available: false,
                    installMethod: 'homebrew',
                    homebrewPackage: 'whisper-cpp',
                    installCommand: 'brew install whisper-cpp',
                    note: 'Homebrew provides native binaries for Intel (x64) and Apple Silicon (arm64)'
                },
                // Windows x64 binary
                windows: {
                    x64: {
                        url: 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.7.6/whisper-bin-x64.zip',
                        sha256: null
                    }
                },
                // Linux x64 binary
                linux: {
                    x64: {
                        url: 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.7.6/whisper-bin-x64.zip',
                        sha256: null
                    }
                }
            }
        }
    }
};

module.exports = { DOWNLOAD_CHECKSUMS };