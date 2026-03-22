# Member003 Matrix Order Map Without Reentry

## Scope

This map uses the legacy seed orders in chronological order and ignores all `reentry` behavior.

Rules used in this sketch:

1. look at `sponsor` first
2. then use order date and invoice number inside that sponsor branch
3. once a member already has a point in the board, later sponsor branches can be placed under that active node
4. no `reentry`

## Seed Order Sequence

Relevant early orders:

1. `00000009` `TH0000013`
2. `00000010` `TH0000016`
3. `00000011` `TH0000017`
4. `00000012` `TH0000020`
5. `00000013` `TH0000023`
6. `00000014` `TH0000031`
7. `00000015` `TH0000032`
8. `00000017` `TH0000028`
9. `00000018` `TH0000029`
10. `00000019` `TH0000030`
11. `00000020` `TH0000036`
12. `00000022` `TH0000034`
13. `00000025` `TH0000039`
14. `00000026` `TH0000053`
15. `00000027` `TH0000037`
16. `00000028` `TH0000046`
17. `00000035` `TH0000074`
18. `00000036` `TH0000075`

## Intended Board Reading

### `TH0000013` Board 1

Direct early branch:

- slot 1 = `TH0000016`
- slot 2 = `TH0000017`

Then the next routed points come from the two active child branches:

- slot 3 = `TH0000023`
- slot 4 = `TH0000020`
- slot 5 = `TH0000031`
- slot 6 = `TH0000032`

Expected board:

```text
TH0000013 Board 1
1=16  2=17
3=23  4=20
5=31  6=32
```

### `TH0000016` Board 1

Direct first two children:

- slot 1 = `TH0000020`
- slot 2 = `TH0000023`

Then later direct children of `16` are routed under the earlier active child node `20`:

- `TH0000028`
- `TH0000036`

And deeper sponsor descendants continue in that branch:

- `TH0000034`
- `TH0000075`

So the no-reentry branch-first reading is:

```text
TH0000016 Board 1
1=20  2=23
3=28  4=36
5=34  6=75
```

### `TH0000020` Board 1

`20` does not directly sponsor anyone, but it can continue receiving points below it after activation.

The routed branch under `20` becomes:

- slot 1 = `TH0000028`
- slot 2 = `TH0000036`
- slot 3 = `TH0000034`
- slot 4 = `TH0000075`
- slot 5 = empty
- slot 6 = empty

```text
TH0000020 Board 1
1=28  2=36
3=34  4=75
5=-   6=-
```

### `TH0000023` Board 1

Sponsor branch under `23` in the confirmed legacy order:

- slot 1 = `TH0000029`
- slot 2 = `TH0000030`
- slot 3 = `TH0000039`
- slot 4 = `TH0000053`
- slot 5 = `TH0000037`
- slot 6 = `TH0000046`

```text
TH0000023 Board 1
1=29  2=30
3=39  4=53
5=37  6=46
```

## Working Hypothesis

Without `reentry`, the clean reading of the early legacy flow is:

- `13` fills from the first active branches `16` and `17`
- `16` fills from the branch rooted at `20` before later branch expansion
- `20` keeps receiving routed points after activation even without direct referrals
- `23` fills from its own sponsor branch first, then deeper child branches `39` and `46` enter before later outer points

This map should be treated as the target sketch for the next sandbox step, not as a proven engine output yet.
