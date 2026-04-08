import subprocess, time, datetime, sys, pathlib, shutil

reset_hour = 19
reset_min = 2

now = datetime.datetime.now()
reset_time = now.replace(hour=reset_hour, minute=reset_min, second=0, microsecond=0)

if reset_time < now:
    reset_time += datetime.timedelta(days=1)

wait_secs = (reset_time - now).total_seconds()
print(f"⏳ Esperando hasta las {reset_time.strftime('%H:%M')}... ({int(wait_secs/60)} min restantes)")
time.sleep(wait_secs)

# Leer prompt desde archivo si se pasa como argumento, sino usar texto directo
arg = sys.argv[1] if len(sys.argv) > 1 else ""
if arg.endswith(".txt") and pathlib.Path(arg).exists():
    prompt = pathlib.Path(arg).read_text(encoding="utf-8")
else:
    prompt = arg

print(f"\n✅ ¡Reset! Lanzando Claude Code...")
subprocess.run(
    [shutil.which("claude") or "claude", "--dangerously-skip-permissions", "--print", prompt],
    shell=True,
    cwd=str(pathlib.Path(__file__).resolve().parent.parent)
)

#python auto_claude.py prompt_noche.txt