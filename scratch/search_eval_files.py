import os

search_term = "evaluacion_servicio"
workspace_dir = "C:/Users/user/sistema-incidencias-sla"

matches = []
for root, dirs, files in os.walk(workspace_dir):
    # Ignorar directorios grandes o innecesarios
    if any(p in root for p in [".next", "node_modules", ".git"]):
        continue
    for file in files:
        if file.endswith(('.ts', '.tsx', '.sql', '.json', '.js')):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    if search_term in content:
                        matches.append(file_path)
            except Exception as e:
                pass

print(f"Found {len(matches)} files referencing '{search_term}':")
for m in matches:
    print(f"- {m}")
