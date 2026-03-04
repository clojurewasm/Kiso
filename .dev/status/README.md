# Kiso Var Coverage Tracking

Tracks implementation status of ClojureScript vars and features.

## Query Examples

```bash
# Count done vars in cljs.core
yq '.vars.cljs_core | to_entries | map(select(.value.status == "done")) | length' vars.yaml

# Count total vars in cljs.core
yq '.vars.cljs_core | to_entries | length' vars.yaml

# List todo functions
yq '.vars.cljs_core | to_entries[] | select(.value.status == "todo" and .value.type == "function") | .key' vars.yaml

# List todo macros
yq '.vars.cljs_core | to_entries[] | select(.value.status == "todo" and .value.type == "macro") | .key' vars.yaml

# Coverage percentage
done=$(yq '.vars.cljs_core | to_entries | map(select(.value.status == "done")) | length' vars.yaml)
total=$(yq '.vars.cljs_core | to_entries | length' vars.yaml)
echo "$done / $total"
```

## Status Values

| Value     | Meaning                         |
|-----------|----------------------------------|
| `done`    | Fully implemented               |
| `partial` | Works for common cases          |
| `todo`    | Not started                     |
| `skip`    | Not applicable / out of scope   |
| `n/a`     | Not relevant for Kiso           |
