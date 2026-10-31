# Used by .github/workflows/desktop.yml: `step <name> <command...>` runs the command, shows the last lines of its output, and on
# failure writes the end of the output as an error annotation (the annotation can be read even when the full log cannot).
step() {
  local n="$1"; shift
  local log="${TMPDIR:-/tmp}/step-$n.log"
  "$@" > "$log" 2>&1; local c=$?
  tail -n 40 "$log"
  if [ $c -ne 0 ]; then
    echo "::error title=$n failed::$(tail -c 1800 "$log" | tr '\r' ' ' | tr '\n' '|' | sed 's/%/%25/g')"
    exit $c
  fi
}
