export interface Command {
  id: string
  label: string
  shortcut?: string
  group?: string
  perform: () => void
}

export interface CommandRegistry {
  register(command: Command): () => void
  unregister(id: string): void
  getAll(): Command[]
  getByGroup(group: string): Command[]
}

export function createCommandRegistry(): CommandRegistry {
  const commands = new Map<string, Command>()

  return {
    register(command: Command) {
      commands.set(command.id, command)
      return () => commands.delete(command.id)
    },
    unregister(id: string) {
      commands.delete(id)
    },
    getAll() {
      return Array.from(commands.values())
    },
    getByGroup(group: string) {
      return Array.from(commands.values()).filter((c) => c.group === group)
    },
  }
}
