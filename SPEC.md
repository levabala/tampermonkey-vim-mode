Movement


- h j k l — left, down, up, right

- w / b — next/previous word start

- e / ge — word end / previous word end

- 0 / ^ / $ — line start / first non-blank / line end

- gg / G — first line / last line

- { / } — previous/next paragraph or block

- f{x} / F{x} — jump to next/prev occurrence of character x on the line

- t{x} / T{x} — like f/F but stop just before/after x

- ; / , — repeat last f/t forward/backward

- % — jump between matching pairs ((), {}, [])

Editing (actions + motions)


- i / a — insert before/after cursor

- I / A — insert at start/end of line

- o / O — open new line below/above and insert

- r{x} — replace single character with x

- s — delete char and insert

- cc — change (replace) whole line

- cw / c$ / ci( — change to motion/end of line/inside ()

- dd — delete line

- dw / d$ / di" — delete to motion/end of line/inside ""

- x / X — delete char under/before cursor

- yy — yank (copy) line

- yw / y$ / yi{ — yank to motion/end of line/inside {}

- p / P — paste after/before cursor

- u — undo

- Ctrl-r — redo

- . — repeat last change

Counts and operators


- [number][command] — repeat (e.g., 5j, 3w, 2dw)

- Operators combine with motions: d (delete), c (change), y (yank), > (indent), < (outdent), = (reindent), g~ (toggle case)
	- Examples: d3w, y}, >i), =%

