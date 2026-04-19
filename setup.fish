#!/usr/bin/env fish

echo "Creating project directories..."
mkdir -p CAD WIP Knowledge Document .pi/agents .pi/extensions

echo "Cloning Kicad library repositories..."
git clone git@github.com:last-sociable-orange/kicad_lib_gen.git
git clone git@github.com:last-sociable-orange/kicad_lib.git
mkdir -p kicad_lib/Step

echo "Cloning subagents extension..."
git clone git@github.com:last-sociable-orange/pi-extensions.git

cp pi-extensions/pi-agent-team/AGENTS.md .
cp -r pi-extensions/pi-agent-team/{SYSTEM.md,agents,extensions} .pi/

echo "Cleaning up..."
rm -rf pi-extensions

echo "✅ Setup complete!"
