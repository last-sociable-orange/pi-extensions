# CircuitPilot: Agent Orchestration for Hardware Design

## Overview

CircuitPilot is an agent orchestration platform designed for hardware design assistance and workflow automation. It employs a team of agents, each with distinct roles, focuses, and capabilities, to simulate a group of hardware engineers. Following a typical hardware design procedure, CircuitPilot equips human engineers with a set of tools and skills to improve both the efficiency and quality of their designs. It also fine-tunes the pi-coding-agent and extends its system prompts, tools, and skills to better suit the specific needs of hardware design.

## Project File Structure
Below explains how files are organized in a hardware design project. Agent shall be aware of this and follow the same rule.

|-- <ProjectFolder>
  |--	CAD 									# Kicad project folder where kicad schematics and PCB files live
	|--	Document							# Project design document, like PRD, design docs for each sub-system with detailed design steps, calculations, references, etc. This is the folder where designer agent write their design documents in Myst format.
	|-- Knowledge							# Project knowledge base, contains product datasheet/user manual, etc. in makrdown format. This folder is mainly maintained by doc agent. doc agent translate pdf files to markdown files and place them here. Each doc have its own folder. This is also the place where designer agent aquire product related knowledge.
    |-- <IC-TPS62870-DS>
    |-- <IC-MIMXRT1170-UM>
	|-- Datasheet							# Original pdf datasheet/user manual/app notes from suppliers. This folder is mainly organized by doc agent and read by users when cross check design doc.
	|-- kicad_lib							# Kicad symbols/footprints/stp, components_db. This folder is mainly maintained by lib agent and users. 
    |-- Symbol              # Kicad symbols, there is Standard.kicad_sym contains many standard symbols used across products, mostly standard passives and discretes from diffent suppliers, and non-standard symbols <ProductType>_<ProductNumber>.kicad_sym that contains only one symbol <ProductType>_<ProductNumber>.
      |-- Standard          # Standard.kicad_sym 
      |-- Symbol            # Non-Standard symbols
    |-- Footprint
      |-- Footprint.pretty  # Kicad footprints for non-standard products
      |-- Standard.pretty   # Kicad footprints for standard products like passives and discretes.
    |-- Step                # Product 3D step file
	|-- WIP		                # Folder for unprocessed downloads, including datasheets, libraries, etc. doc and lib agents check files in this folder and process them per user's requst.

## File Processing Stages and Agent Folder Use Rule

### File processing stages
Files have 4 processing stages:
- **Unprocessed**: all files in `WIP` folder are unprocessed
- **WIP**: Work In Process, agent is renaming/extracting/summarizing/manipulating it 
- **Review**: agent has finished its work, need user to review
- **Approved**: user has reviewed and approved file
- **Trash**: files are not needed anymore

### Agent Folder Use
Agents start their work from `WIP` folder. They directly move files to, for example, `Datasheet/.wip` and `kicad_lib/.wip` folders to set files to **WIP** stage. After working out user's request, they move files to `Datasheet/.review` and `kicad_lib/.review`, set files to **Review** stage and ask user to review them. After review, files are either moved back to `.wip` if further work are needed or moved to `Datasheet` or `kicad_lib\Symbol|Footprint|Step` root folders if user approves.

### Rules
- `.wip` and `.review` folders are used to set file processing stage to **WIP** and **Review**
- Only move files out from `.review` to root folder when user approves files. Files are now in **Approved** stage 

Example:
User downloads datasheet tps62870.pdf and saves it in `WIP` folder. Here is what happens after:
- doc agent moves it to `Datasheet/.wip`
- doc agent reads it using pdf-utils and finds out it is a datasheet and product number is tps62870
- doc agent renames it to `IC-TPS62870-DS.pdf`
- doc agent copies it to `Knowledge/.wip/IC-TPS62870-DS/` and translates it to markdown file
- doc agent moves `IC-TPS62870-DS.pdf` to `Datasheet/.review`
- doc agent moves `IC-TPS62870-DS/` folder to `Knowledge/.review` 
- doc agent asks user to review
- user approves
- doc agent moves `IC-TPS62870-DS.pdf` to `Datasheet` and `IC-TPS62870-DS/` to `Knowledge`

### Delete Files
Agent **Do not** delete files. Agent can move files to `.trash` folder to set files to **Trash** stage.

Example:
lib agent moves downloaded `.zip` to `kicad_lib/.trash` after user approved symbol and footprint.

## File Naming Convention
- doc agent rename datasheet/user manual/app notes etc. following format: <product_type>-<product_number>-<document_type>.<pdf|md>
- lib agent rename symbol/footprint/step file following format: <product_type>_<product_number_full>.<kicad_sym|kicad_mod|stp>
- File name all capital letters, except for file extension.
- Replace illegal char with "_" if needed

### Product Type 
Product type roughly follows reference designator conventions (en.wikipedia.org/wiki/Reference_designator). There are some minor tweaks:
- R, RN, RT, for resistor, resistor network, thermistor
- C, for polarized or non-pol capacitor
- IC, for integrated circuits
- D, for all kinds of diodes, including schottky, tvs, LED, zener, etc.
- L, for inductors, coils, common mode chocks, filters (other than ferrite bead)
- Q, for transistors, including BJTs, FETs
- CON, for connectors
- SW, for switches
- XTAL, for crystal and oscillator
- RLY, for mechanical or solidstate relays
- M, for mechanical hardware, like mounting holes, standoffs
- TP, test point
- FB, ferrite beads
- F, fuse, PTC fuse
- BAT, for batteries, holders
- XFMR, for transformers
- SPK, MIC, for speaker and mic

**Important**: Ask user if product type is not in this list

### Product Number
Product number is the manufacturer's part number. 

- Product number: general part number that may map to series of products with differnt packages, pin functions, temperature range, output voltages, etc. 

- Full product number: includes package suffix and shall only map to one product. It is also called manufacturer's product order number.

  For example: 

    + TJA1051T is a series CAN transceiver products with different pin mappings and packages.
    + TJA1051TK/3 is full product number that only maps to TJA1051T with HVSON8 package.

### Document Type
Document type is two letters abbreviation of document type.
- DS: datasheet
- UM: user manual
- UR: user reference
- AN: app note
and so on...

