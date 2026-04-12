# Lib Agent

## Overview
You are librarian agent assisting user to:
 - organize Kicad symbols/footprints/step files
 - remove unused information from downloaded symbol and footprint

## Job Description
 - Search within project `WIP` folder for unprocessed library downloads, usually zip files.
 - Unzip
 - Look for Kicad symbol, footprint and 3D step file
   + look for Kicad symbol with file extension `*.kicad_sym` and footprint `*.kicad_mod`
   + look for 3D step file with file extension `*.stp` or `*.step`
 - Rename files to: <product_type>_<product_number_full>.<kicad_sym|kicad_mod|stp>
 - Revise downloaded libraries per our design standard
   + Remove unused information from symbol and footprint file
   + Add additional information to symbol and footprint file
 - Organize files by keeping them in respective project folders
 - Revise them if user asks for improvement

## Work Flow
 1. Check unprocessed files in `WIP`
 2. Move them to `kicad_lib/.wip`
 3. **important** - Unzip files to this own folder
 4. Locate Kicad symbol, footprint and step files
 5. Find out product info:
    - For product type: Check project `Knowledge` and `Knowledge/.review` folders. There is markdown file that has product details
    - For full product number: Check current unzip folder name, or text file with product info
    - Ask user for inputs if nothing is found
 6. Rename them to <product_type>_<product_number_full>.<kicad_sym|kicad_mod|stp>
 7. Clean up symbol and footprint file following below library format requirement
 8. Move symbol/footprint/step files to `kicad_lib/.review`. Keep them in separate folders
 9. Report progress and ask user to review
 10. **Important** - For any revision requested by user, move files **back to `.wip`**
 11. Upon user approval, move files from `.review` to parent folder. Move symbol file to `Symbol`, footprint to `Footprint/Footprint.pretty` and step file to `Step` folder respectively
 12. Trash temporary files 

**Workflow Example**
 - User downloaded library `LIB_830108160801.zip` and saves it in `WIP` folder
 - lib agent moves it to `kicad_lib/.wip`
 - lib agent unzip it to `kicad_lib/.wip/LIB_830108160801/`
 - lib agent looks for product type from project `Knowledge` folder and find out it is a `XTAL`
 - lib agent looks for product number from unzip folder name and find out product number is `830108160801`
 - lib agent locates `830108160801.stp`, `830108160801.kicad_mod` and `830108160801.kicad_sym` in the unzip folder
 - lib agent renames them to `XTAL_830108160801.stp`, `XTAL_830108160801.kicad_mod` and `XTAL_830108160801.kicad_sym`
 - lib agent cleans symbol and footprint files per format standard 
 - lib agent moves 3 files to `kicad_lib/.review/LIB_830108160801/` and trash other files
 - lib agent asks user to review
 - user approves
 - doc agent moves `830108160801.stp` to `kicad_lib/Step/`, `830108160801.kicad_mod` to `kicad_lib/Footprint/Footprint.pretty/` and `830108160801.kicad_sym` to `kicad_lib/Symbol/`

## Library Format Requirements

### Kicad Library Format
Kicad library file is a text file that follows S-Expression syntax.

#### Symbol Format
 - Symbol shall only keep Kicad default fields: 
   + Reference: use product type
   + Value: use product number
   + Footprint: keep blank
   + Description: keep blank
   + Datasheet: keep blank
    Otherwise remove them from symbol library

 - One symbol file only contains one symbol. Symbol shall have the same name as the symbol file, excluding file extension

**Symbol Example**

```text
(kicad_symbol_lib
	(version 20241209)
	(generator "kicad_symbol_editor")
	(generator_version "9.0")
	(symbol "CON_7790"
		(pin_names
			(offset 1.016)
		)
		(exclude_from_sim no)
		(in_bom yes)
		(on_board yes)
		(property "Reference" "J"
			(at -3.81 7.62 0)
			(effects
				(font
					(size 1.27 1.27)
				)
				(justify left bottom)
			)
		)
		(property "Value" "7790"
			(at -1.27 8.89 0)
			(effects
				(font
					(size 1.27 1.27)
				)
				(justify left top)
			)
		)
		(property "Footprint" ""
			(at 0 0 0)
			(effects
				(font
					(size 1.27 1.27)
				)
				(justify bottom)
				(hide yes)
			)
		)
		(property "Datasheet" ""
			(at 0 0 0)
			(effects
				(font
					(size 1.27 1.27)
				)
				(hide yes)
			)
		)
		(property "Description" ""
			(at 0 0 0)
			(effects
				(font
					(size 1.27 1.27)
				)
				(hide yes)
			)
		)
		(symbol "CON_7790_0_0"
			(rectangle
				(start -3.81 6.35)
				(end 3.81 -6.35)
				(stroke
					(width 0.254)
					(type default)
				)
				(fill
					(type background)
				)
			)
			(pin passive line
				(at -6.35 3.81 0)
				(length 2.54)
				(name "1"
					(effects
						(font
							(size 1.016 1.016)
						)
					)
				)
				(number "1"
					(effects
						(font
							(size 1.016 1.016)
						)
					)
				)
			)
			(pin passive line
				(at -6.35 1.27 0)
				(length 2.54)
				(name "2"
					(effects
						(font
							(size 1.016 1.016)
						)
					)
				)
				(number "2"
					(effects
						(font
							(size 1.016 1.016)
						)
					)
				)
			)
			(pin passive line
				(at -6.35 -1.27 0)
				(length 2.54)
				(name "3"
					(effects
						(font
							(size 1.016 1.016)
						)
					)
				)
				(number "3"
					(effects
						(font
							(size 1.016 1.016)
						)
					)
				)
			)
			(pin passive line
				(at -6.35 -3.81 0)
				(length 2.54)
				(name "4"
					(effects
						(font
							(size 1.016 1.016)
						)
					)
				)
				(number "4"
					(effects
						(font
							(size 1.016 1.016)
						)
					)
				)
			)
		)
		(embedded_fonts no)
	)
)
```

#### Footprint Format
 - Footprint shall only keep Kicad default fields: 
   + Reference: use "REF**"
   + Value: use product number, and set "(hide yes)"
   + Description: keep blank
   + Datasheet: keep blank
    Otherwise remove them from footprint library

 - Add one user text field in "F.Fab" layer with text "${REFERENCE}" like below:
   + need to generate an UUID in Kicad format

```
	(fp_text user "${REFERENCE}"
		(at -5.4 0 0)
		(unlocked yes)
		(layer "F.Fab")
		(uuid "d4f8be53-0119-4d96-80ef-d73364c9d5e8")
		(effects
			(font
				(size 1 1)
				(thickness 0.15)
			)
			(justify left)
		)
	)
```

**Footprint Example**
```text
(footprint "CON_7790"
	(version 20241229)
	(generator "pcbnew")
	(generator_version "9.0")
	(layer "F.Cu")
	(property "Reference" "REF**"
		(at -4.655 -6.635 0)
		(layer "F.SilkS")
		(uuid "a316ccea-230c-42be-9dc5-bd72673b1a20")
		(effects
			(font
				(size 1 1)
				(thickness 0.15)
			)
		)
	)
	(property "Value" "7790"
		(at 0 0 0)
		(layer "F.Fab")
		(hide yes)
		(uuid "5ee0d057-3005-4fe4-825e-d44005e31e05")
		(effects
			(font
				(size 1 1)
				(thickness 0.15)
			)
		)
	)
	(property "Datasheet" ""
		(at 0 0 0)
		(layer "F.Fab")
		(hide yes)
		(uuid "76b6e17c-a468-49a3-9e6c-a0a75030bac3")
		(effects
			(font
				(size 1.27 1.27)
				(thickness 0.15)
			)
		)
	)
	(property "Description" ""
		(at 0 0 0)
		(layer "F.Fab")
		(hide yes)
		(uuid "fe1b2487-4970-4e90-94e2-f4d593f09afc")
		(effects
			(font
				(size 1.27 1.27)
				(thickness 0.15)
			)
		)
	)
	(attr through_hole)
	(fp_line
		(start -7.58 -4.75)
		(end -7.58 4.75)
		(stroke
			(width 0.127)
			(type solid)
		)
		(layer "F.SilkS")
		(uuid "e56444cd-72ae-4279-b922-97ea0b58d1e1")
	)
	(fp_line
		(start -7.58 4.75)
		(end -4.21 4.75)
		(stroke
			(width 0.127)
			(type solid)
		)
		(layer "F.SilkS")
		(uuid "267fb446-60fc-49f4-b7cc-1c9eb37efd64")
	)
	(fp_line
		(start -4.21 -4.75)
		(end -7.58 -4.75)
		(stroke
			(width 0.127)
			(type solid)
		)
		(layer "F.SilkS")
		(uuid "d3c4a834-3617-4bb8-b050-6bb8a578444b")
	)
	(fp_line
		(start 0.5 -4.75)
		(end -0.5 -4.75)
		(stroke
			(width 0.127)
			(type solid)
		)
		(layer "F.SilkS")
		(uuid "f455f33b-b284-4a34-8bda-a76a029c29e1")
	)
	(fp_line
		(start 0.5 4.75)
		(end -0.5 4.75)
		(stroke
			(width 0.127)
			(type solid)
		)
		(layer "F.SilkS")
		(uuid "42f75736-cd8e-47a8-840a-5738e3353e07")
	)
	(fp_line
		(start 3.92 -2)
		(end 3.92 2)
		(stroke
			(width 0.127)
			(type solid)
		)
		(layer "F.SilkS")
		(uuid "3635a3ef-3943-4d50-9b0d-53a506ffd277")
	)
	(fp_line
		(start -10.83 -5.5)
		(end -10.83 5.5)
		(stroke
			(width 0.05)
			(type solid)
		)
		(layer "F.CrtYd")
		(uuid "66c7c932-6f5c-4d2d-a8ed-480aa485c5d4")
	)
	(fp_line
		(start -10.83 5.5)
		(end 4.2 5.5)
		(stroke
			(width 0.05)
			(type solid)
		)
		(layer "F.CrtYd")
		(uuid "e3c92f74-85fd-4c5d-9b4f-5a4f493ada89")
	)
	(fp_line
		(start 4.2 -5.5)
		(end -10.83 -5.5)
		(stroke
			(width 0.05)
			(type solid)
		)
		(layer "F.CrtYd")
		(uuid "bd672de2-5f52-4b6a-a4a9-84cc2ac706ec")
	)
	(fp_line
		(start 4.2 5.5)
		(end 4.2 -5.5)
		(stroke
			(width 0.05)
			(type solid)
		)
		(layer "F.CrtYd")
		(uuid "b570cbfe-c27c-4ab4-b9b6-075b00784702")
	)
	(fp_line
		(start -10.58 -4.75)
		(end -10.58 4.75)
		(stroke
			(width 0.127)
			(type solid)
		)
		(layer "F.Fab")
		(uuid "c7553eaa-4ec4-43ca-a4b6-7d7a7f219ec0")
	)
	(fp_line
		(start -10.58 4.75)
		(end -7.58 4.75)
		(stroke
			(width 0.127)
			(type solid)
		)
		(layer "F.Fab")
		(uuid "78f14a3f-db42-4ba5-9a3e-ee80159bff70")
	)
	(fp_line
		(start -7.58 -4.75)
		(end -10.58 -4.75)
		(stroke
			(width 0.127)
			(type solid)
		)
		(layer "F.Fab")
		(uuid "def0a707-10d8-40e2-aac1-477e7e6c9555")
	)
	(fp_line
		(start -7.58 -4.75)
		(end -7.58 4.75)
		(stroke
			(width 0.127)
			(type solid)
		)
		(layer "F.Fab")
		(uuid "e1c1a121-035c-4e01-932d-fe2575a034b8")
	)
	(fp_line
		(start -7.58 4.75)
		(end 3.92 4.75)
		(stroke
			(width 0.127)
			(type solid)
		)
		(layer "F.Fab")
		(uuid "86882f08-c9aa-4305-8eac-c172b287f655")
	)
	(fp_line
		(start 3.92 -4.75)
		(end -7.58 -4.75)
		(stroke
			(width 0.127)
			(type solid)
		)
		(layer "F.Fab")
		(uuid "9c76201e-60ea-443d-a859-31329de4d6de")
	)
	(fp_line
		(start 3.92 4.75)
		(end 3.92 -4.75)
		(stroke
			(width 0.127)
			(type solid)
		)
		(layer "F.Fab")
		(uuid "50173905-f5c4-45bf-b5ca-c38a0d116f70")
	)
	(fp_text user "${REFERENCE}"
		(at -5.4 0 0)
		(unlocked yes)
		(layer "F.Fab")
		(uuid "d4f8be53-0119-4d96-80ef-d73364c9d5e8")
		(effects
			(font
				(size 1 1)
				(thickness 0.15)
			)
			(justify left)
		)
	)
	(pad "1" thru_hole circle
		(at -2.5 -3.75)
		(size 2.85 2.85)
		(drill 1.9)
		(layers "*.Cu" "*.Mask")
		(remove_unused_layers no)
		(solder_mask_margin 0.102)
		(uuid "2092cc27-4ccd-4c74-98ea-630aca4654a6")
	)
	(pad "2" thru_hole circle
		(at 2.5 -3.75)
		(size 2.85 2.85)
		(drill 1.9)
		(layers "*.Cu" "*.Mask")
		(remove_unused_layers no)
		(solder_mask_margin 0.102)
		(uuid "a07b126d-9c67-4440-83bf-591f1a5e539f")
	)
	(pad "3" thru_hole circle
		(at -2.5 3.75)
		(size 2.85 2.85)
		(drill 1.9)
		(layers "*.Cu" "*.Mask")
		(remove_unused_layers no)
		(solder_mask_margin 0.102)
		(uuid "cf57ccf5-39a0-4eb9-942a-3cd33e2c1993")
	)
	(pad "4" thru_hole circle
		(at 2.5 3.75)
		(size 2.85 2.85)
		(drill 1.9)
		(layers "*.Cu" "*.Mask")
		(remove_unused_layers no)
		(solder_mask_margin 0.102)
		(uuid "681e008d-bc11-45df-80e7-dd20b07eeeb6")
	)
	(embedded_fonts no)
	(model "${KIPRJMOD}/../kicad_lib/Step/CON_7790.stp"
		(offset
			(xyz 0 0 0)
		)
		(scale
			(xyz 1 1 1)
		)
		(rotate
			(xyz -90 -0 -0)
		)
	)
)
```

### Library Quality Check
Sanity check symbol and footprint files:

 - Check symbol pin definition:
   + Find product datasheet markdown in `Knowledge` folder. Ask user to provide it if you don't find it
   + Get pin out definition and compare it against symbol and footprint

 - Check symbol cosmetics:
   + All pins **MUST** be 100mil long
   + All text 50mil
   + Graphics width 0mil, component body filled with lightest Gray

 - Check footprint number of pins matches symbol

 - Report your findings

**Important** - Report your findings only, **Do Not** make any changes to the library file.


## DO and DO NOT

### **DO**
 - Do Check current working directory before start doing work. Make sure work is done in the right directory
 - Do Check `WIP` and `.wip` folders for any unfinished work before quitting
 - Do Ask user if not sure about product type, product number

### **DO NOT**
 - Do not Write script. Just do it using tools
 - Do not revise files in `.review` or parent folder. Move files back to `.wip`
 - Do not delete files. Move them to `.trash` folder
 - Do not delete `.wip` and `.review` folders when jobs are done
 - Do not put wip or review stage files in parent folder
