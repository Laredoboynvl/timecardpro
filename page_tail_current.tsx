                    {role.notes.trim() ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Notas internas
                        </p>
                        <p className="text-sm text-slate-700 whitespace-pre-line">{role.notes}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSavedRolesModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPositionModalOpen} onOpenChange={setIsPositionModalOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Puestos y cupos por área</DialogTitle>
            <DialogDescription>
              Ajusta la cantidad de colaboradores por puesto y deja que el sistema los asigne automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="space-y-4 lg:w-[340px] lg:flex-shrink-0">
              <div className="grid gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Empleados activos</p>
                  <p className="text-2xl font-semibold text-slate-900">{activeEmployeeCount}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Personal disponible para asignar en la semana seleccionada.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Puestos configurados</p>
                  <p className="text-2xl font-semibold text-slate-900">{totalRequiredSlots}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Incluye puestos fijos y rotativos de todas las áreas.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Asignaciones actuales</p>
                  <p className="text-2xl font-semibold text-slate-900">{assignedCount}</p>
                  <p
                    className={`text-xs font-medium ${
                      slotBalance === 0
                        ? "text-emerald-600"
                        : slotBalance > 0
                        ? "text-amber-600"
                        : "text-rose-600"
                    }`}
                  >
                    {slotBalance === 0
                      ? "Cupos equilibrados"
                      : slotBalance > 0
                      ? `${slotBalance} colaborador(es) pendientes por ubicar`
                      : `${Math.abs(slotBalance)} puesto(s) excedentes configurados`}
                  </p>
                </div>
              </div>

              <div>
                {slotBalance < 0 ? (
                  <Alert variant="destructive">
                    <AlertTitle>Exceso de puestos configurados</AlertTitle>
                    <AlertDescription>
                      Reduce {Math.abs(slotBalance)} puesto(s) para coincidir con los {activeEmployeeCount} colaboradores activos.
                    </AlertDescription>
                  </Alert>
                ) : slotBalance > 0 ? (
                  <Alert>
                    <AlertTitle>Personal pendiente por ubicar</AlertTitle>
                    <AlertDescription>
                      Configura {slotBalance} puesto(s) adicional(es) para cubrir a todo el equipo.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    <AlertTitle>Cupos equilibrados</AlertTitle>
                    <AlertDescription>Los puestos configurados coinciden con la plantilla activa.</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-slate-800">Configuraciones guardadas de cupos</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="sm:w-auto"
                    onClick={() => {
                      setPositionPresetName("")
                      setIsSavePositionPresetModalOpen(true)
                    }}
                  >
                    Guardar cupos actuales
                  </Button>
                </div>
                {isLoadingPositionPresets ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Cargando configuraciones guardadas...
                  </p>
                ) : positionPresets.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Aún no guardas distribuciones de puestos. Configura los cupos y almacénalos para reutilizarlos en semanas futuras.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="sm:flex-1">
                      <Label className="text-xs uppercase text-muted-foreground">Selecciona una configuración</Label>
                      <Select
                        value={selectedPositionPresetId ?? ""}
                        onValueChange={(value) => handleApplyPositionPreset(value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Elige cupos guardados" />
                        </SelectTrigger>
                        <SelectContent>
                          {positionPresets.map((preset) => (
                            <SelectItem key={preset.id} value={preset.id}>
                              {preset.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedPositionPresetId ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="justify-start gap-2 text-red-600 hover:text-red-600"
                        onClick={() => void handleDeletePositionPreset(selectedPositionPresetId)}
                        disabled={deletingPositionPresetId === selectedPositionPresetId}
                      >
                        {deletingPositionPresetId === selectedPositionPresetId ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Eliminando...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <ScrollArea className="max-h-[65vh] flex-1 pr-2">
              <div className="space-y-6 py-1">
                <section className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase text-slate-700">
                      Centro de Atención a Solicitantes
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Configura los puestos operativos base para la semana seleccionada.
                    </p>
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-3">
                      {UNIT_POSITIONS.filter((position) => position.category === "CAS").map(
                        (position: PositionDefinition) => {
                          const assignedCount = assignments[position.id]?.length || 0
                          const requiredCount = positionSlots[position.id] || 0
                          return (
                            <div key={position.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs uppercase">
                                    {position.code}
                                  </Badge>
                                  <span className="text-sm font-semibold text-slate-800">{position.name}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{position.description}</p>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span>Puestos</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={positionSlots[position.id] ?? 0}
                                    onChange={(event) => handleSlotChange(position.id, event.target.value)}
                                    className="h-8 w-20 text-center"
                                  />
                                  <span className="text-[11px] uppercase tracking-wide">
                                    {assignedCount} / {requiredCount} asignados
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  La asignación se realiza automáticamente al generar el rol.
                                </p>
                              </div>
                              <div className="mt-3 space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                  Asignar colaborador específico
                                </Label>
                                <Select
                                  key={`fix-select-${position.id}-${(assignments[position.id] || []).join("-")}`}
                                  onValueChange={(employeeId) => handleAssignEmployeeToPosition(position.id, employeeId)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sortedActiveEmployees
                                      .filter((employee) => isEmployeeEligibleForPosition(employee, position.id))
                                      .map((employee) => {
                                        const currentAssignment = employeeAssignments[employee.id]
                                        const labelParts = [getEmployeeDisplayName(employee)]
                                        if (employee.employee_code) {
                                          labelParts.push(`Código ${employee.employee_code}`)
                                        }
                                        if (currentAssignment && currentAssignment.id !== position.id) {
                                          labelParts.push(`(${currentAssignment.code})`)
                                        }
                                        return (
                                          <SelectItem key={employee.id} value={employee.id}>
                                            {labelParts.join(" · ")}
                                          </SelectItem>
                                        )
                                      })}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="mt-3 space-y-2">
                                {(assignments[position.id] || []).length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Sin colaboradores asignados.</p>
                                ) : (
                                  assignments[position.id].map((employeeId) => {
                                    const employee = employeeMap.get(employeeId)
                                    return (
                                      <div
                                        key={employeeId}
                                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Badge variant="secondary" className="px-3 py-1">
                                            {getEmployeeDisplayName(employee)}
                                          </Badge>
                                          {employee?.employee_code ? (
                                            <span className="text-[11px] uppercase text-muted-foreground">
                                              {employee.employee_code}
                                            </span>
                                          ) : null}
                                        </div>
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          className="text-red-500 hover:text-red-600"
                                          onClick={() => handleRemoveAssignment(position.id, employeeId)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )
                                  })
                                )}
                              </div>
                            </div>
                          )
                        }
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs uppercase text-muted-foreground">Supervisores</p>
                      <div className="space-y-3">
                        {SUPERVISOR_POSITIONS.filter((position) => position.category === "CAS").map(
                          (position: PositionDefinition) => {
                            const assignedCount = assignments[position.id]?.length || 0
                            const requiredCount = positionSlots[position.id] || 0
                            return (
                              <div key={position.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-xs uppercase">
                                      {position.code}
                                    </Badge>
                                    <span className="text-sm font-semibold text-slate-800">{position.name}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{position.description}</p>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                    <span>Puestos</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={positionSlots[position.id] ?? 0}
                                      onChange={(event) => handleSlotChange(position.id, event.target.value)}
                                      className="h-8 w-20 text-center"
                                    />
                                    <span className="text-[11px] uppercase tracking-wide">
                                      {assignedCount} / {requiredCount} asignados
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    La asignación se realiza automáticamente al generar el rol.
                                  </p>
                                </div>
                                <div className="mt-3 space-y-2">
                                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Asignar colaborador específico
                                  </Label>
                                  <Select
                                    key={`fix-select-${position.id}-${(assignments[position.id] || []).join("-")}`}
                                    onValueChange={(employeeId) => handleAssignEmployeeToPosition(position.id, employeeId)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleccionar colaborador" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {sortedActiveEmployees
                                        .filter((employee) => isEmployeeEligibleForPosition(employee, position.id))
                                        .map((employee) => {
                                          const currentAssignment = employeeAssignments[employee.id]
                                          const labelParts = [getEmployeeDisplayName(employee)]
                                          if (employee.employee_code) {
                                            labelParts.push(`Código ${employee.employee_code}`)
                                          }
                                          if (currentAssignment && currentAssignment.id !== position.id) {
                                            labelParts.push(`(${currentAssignment.code})`)
                                          }
                                          return (
                                            <SelectItem key={employee.id} value={employee.id}>
                                              {labelParts.join(" · ")}
                                            </SelectItem>
                                          )
                                        })}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="mt-3 space-y-2">
                                  {(assignments[position.id] || []).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Sin colaboradores asignados.</p>
                                  ) : (
                                    assignments[position.id].map((employeeId) => {
                                      const employee = employeeMap.get(employeeId)
                                      return (
                                        <div
                                          key={employeeId}
                                          className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                                        >
                                          <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="px-3 py-1">
                                              {getEmployeeDisplayName(employee)}
                                            </Badge>
                                            {employee?.employee_code ? (
                                              <span className="text-[11px] uppercase text-muted-foreground">
                                                {employee.employee_code}
                                              </span>
                                            ) : null}
                                          </div>
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => handleRemoveAssignment(position.id, employeeId)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                              </div>
                            )
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase text-slate-700">Consulado</h3>
                    <p className="text-xs text-muted-foreground">
                      Define los puestos administrativos para el personal del consulado.
                    </p>
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-3">
                      {UNIT_POSITIONS.filter((position) => position.category === "Consulado").map(
                        (position: PositionDefinition) => {
                          const assignedCount = assignments[position.id]?.length || 0
                          const requiredCount = positionSlots[position.id] || 0
                          return (
                            <div key={position.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs uppercase">
                                    {position.code}
                                  </Badge>
                                  <span className="text-sm font-semibold text-slate-800">{position.name}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{position.description}</p>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span>Puestos</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={positionSlots[position.id] ?? 0}
                                    onChange={(event) => handleSlotChange(position.id, event.target.value)}
                                    className="h-8 w-20 text-center"
                                  />
                                  <span className="text-[11px] uppercase tracking-wide">
                                    {assignedCount} / {requiredCount} asignados
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  La asignación se realiza automáticamente al generar el rol.
                                </p>
                              </div>
                              <div className="mt-3 space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                  Asignar colaborador específico
                                </Label>
                                <Select
                                  key={`fix-select-${position.id}-${(assignments[position.id] || []).join("-")}`}
                                  onValueChange={(employeeId) => handleAssignEmployeeToPosition(position.id, employeeId)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sortedActiveEmployees
                                      .filter((employee) => isEmployeeEligibleForPosition(employee, position.id))
                                      .map((employee) => {
                                        const currentAssignment = employeeAssignments[employee.id]
                                        const labelParts = [getEmployeeDisplayName(employee)]
                                        if (employee.employee_code) {
                                          labelParts.push(`Código ${employee.employee_code}`)
                                        }
                                        if (currentAssignment && currentAssignment.id !== position.id) {
                                          labelParts.push(`(${currentAssignment.code})`)
                                        }
                                        return (
                                          <SelectItem key={employee.id} value={employee.id}>
                                            {labelParts.join(" · ")}
                                          </SelectItem>
                                        )
                                      })}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="mt-3 space-y-2">
                                {(assignments[position.id] || []).length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Sin colaboradores asignados.</p>
                                ) : (
                                  assignments[position.id].map((employeeId) => {
                                    const employee = employeeMap.get(employeeId)
                                    return (
                                      <div
                                        key={employeeId}
                                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Badge variant="secondary" className="px-3 py-1">
                                            {getEmployeeDisplayName(employee)}
                                          </Badge>
                                          {employee?.employee_code ? (
                                            <span className="text-[11px] uppercase text-muted-foreground">
                                              {employee.employee_code}
                                            </span>
                                          ) : null}
                                        </div>
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          className="text-red-500 hover:text-red-600"
                                          onClick={() => handleRemoveAssignment(position.id, employeeId)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )
                                  })
                                )}
                              </div>
                            </div>
                          )
                        }
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs uppercase text-muted-foreground">Supervisores</p>
                      <div className="space-y-3">
                        {SUPERVISOR_POSITIONS.filter((position) => position.category === "Consulado").map(
                          (position: PositionDefinition) => {
                            const assignedCount = assignments[position.id]?.length || 0
                            const requiredCount = positionSlots[position.id] || 0
                            return (
                              <div key={position.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-xs uppercase">
                                      {position.code}
                                    </Badge>
                                    <span className="text-sm font-semibold text-slate-800">{position.name}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{position.description}</p>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                    <span>Puestos</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={positionSlots[position.id] ?? 0}
                                      onChange={(event) => handleSlotChange(position.id, event.target.value)}
                                      className="h-8 w-20 text-center"
                                    />
                                    <span className="text-[11px] uppercase tracking-wide">
                                      {assignedCount} / {requiredCount} asignados
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    La asignación se realiza automáticamente al generar el rol.
                                  </p>
                                </div>
                                <div className="mt-3 space-y-2">
                                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    Asignar colaborador específico
                                  </Label>
                                  <Select
                                    key={`fix-select-${position.id}-${(assignments[position.id] || []).join("-")}`}
                                    onValueChange={(employeeId) => handleAssignEmployeeToPosition(position.id, employeeId)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleccionar colaborador" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {sortedActiveEmployees
                                        .filter((employee) => isEmployeeEligibleForPosition(employee, position.id))
                                        .map((employee) => {
                                          const currentAssignment = employeeAssignments[employee.id]
                                          const labelParts = [getEmployeeDisplayName(employee)]
                                          if (employee.employee_code) {
                                            labelParts.push(`Código ${employee.employee_code}`)
                                          }
                                          if (currentAssignment && currentAssignment.id !== position.id) {
                                            labelParts.push(`(${currentAssignment.code})`)
                                          }
                                          return (
                                            <SelectItem key={employee.id} value={employee.id}>
                                              {labelParts.join(" · ")}
                                            </SelectItem>
                                          )
                                        })}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="mt-3 space-y-2">
                                  {(assignments[position.id] || []).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Sin colaboradores asignados.</p>
                                  ) : (
                                    assignments[position.id].map((employeeId) => {
                                      const employee = employeeMap.get(employeeId)
                                      return (
                                        <div
                                          key={employeeId}
                                          className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                                        >
                                          <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="px-3 py-1">
                                              {getEmployeeDisplayName(employee)}
                                            </Badge>
                                            {employee?.employee_code ? (
                                              <span className="text-[11px] uppercase text-muted-foreground">
                                                {employee.employee_code}
                                              </span>
                                            ) : null}
                                          </div>
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => handleRemoveAssignment(position.id, employeeId)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                              </div>
                            )
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPositionModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSavePositionPresetModalOpen}
        onOpenChange={(open) => {
          setIsSavePositionPresetModalOpen(open)
          if (!open) {
            setPositionPresetName("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar configuración de cupos</DialogTitle>
            <DialogDescription>
              Almacena la cantidad de colaboradores por puesto para reutilizarla en próximas semanas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="position-preset-name">Nombre de la configuración</Label>
              <Input
                id="position-preset-name"
                value={positionPresetName}
                onChange={(event) => setPositionPresetName(event.target.value)}
                placeholder="Ej. Operación completa CAS"
              />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold">Se guardarán los siguientes datos:</p>
              <p>• Número de puestos por cada posición del CAS y Consulado.</p>
              <p>• Se respetarán los puestos mínimos necesarios para los colaboradores marcados como fijos.</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Las configuraciones quedan almacenadas en la base de datos de esta oficina y estarán disponibles la próxima vez que ingreses.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsSavePositionPresetModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmSavePositionPreset()}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={isSavingPositionPreset}
            >
              {isSavingPositionPreset ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                "Guardar cupos"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAttributeModalOpen} onOpenChange={setIsAttributeModalOpen}>
    return () => {
      cancelled = true
    }
  }, [office, toast])

  useEffect(() => {
    const validIds = new Set(employees.map((emp) => emp.id))

    setAssignments((prev) => {
      const next = createEmptyAssignments()
      for (const position of ALL_POSITIONS) {
        const current = prev[position.id] || []
        next[position.id] = current.filter((employeeId) => validIds.has(employeeId))
      }
      return next
    })

    setAttributes((prev) =>
      prev.map((attribute) => ({
        ...attribute,
        employeeIds: attribute.employeeIds.filter((employeeId) => validIds.has(employeeId)),
      }))
    )

    setScheduleOverrides((prev) => {
      const next: Record<string, Record<string, string>> = {}
      for (const [employeeId, overrides] of Object.entries(prev)) {
        if (!validIds.has(employeeId)) continue
        next[employeeId] = { ...overrides }
      }
      return next
    })
  }, [employees])

  const weekDays = useMemo(() => computeWeekDays(weekStartDate), [weekStartDate])

  useEffect(() => {
    const validDates = new Set(weekDays.map((day) => day.date))
    setScheduleOverrides((prev) => {
      const next: Record<string, Record<string, string>> = {}
      for (const [employeeId, overrides] of Object.entries(prev)) {
        const filteredEntries = Object.entries(overrides).filter(
          ([date, value]) => validDates.has(date) && value.trim().length > 0
        )
        if (filteredEntries.length > 0) {
          next[employeeId] = Object.fromEntries(filteredEntries)
        }
      }
      return next
    })
  }, [weekDays])

  useEffect(() => {
    if (!office || weekDays.length === 0) return

    let cancelled = false

    const loadCalendarData = async () => {
      setIsLoadingCalendar(true)
      try {
        const start = weekDays[0].date
        const end = weekDays[weekDays.length - 1].date

        const [holidays, vacationRequests] = await Promise.all([
          fetchHolidaysInRangeClient(office.id, start, end),
          getVacationRequests(office.id),
        ])

        if (cancelled) return

        setHolidayDates(holidays.map((holiday) => holiday.holiday_date))
        setVacationMap(buildVacationMap(vacationRequests, start, end))
      } catch (error) {
        console.error("Error al cargar vacaciones/festivos:", error)
        if (!cancelled) {
          toast({
            title: "No se pudo cargar el calendario",
            description: "Verifica tu conexión e intenta de nuevo",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCalendar(false)
        }
      }
    }

    loadCalendarData()

    return () => {
      cancelled = true
    }
  }, [office, weekDays, toast])

  useEffect(() => {
    if (!office) return

    let cancelled = false

    const loadSchedulePresets = async () => {
      setIsLoadingSchedulePresets(true)
      try {
        const records = await fetchRoleSchedulePresets(office.id)
        if (cancelled) return
        const normalized = records.map((record) => ({
          id: record.id,
          name: record.name,
          shiftName: record.shift_name,
          startTime: record.start_time,
          endTime: record.end_time,
          scheduleMatrix: cloneScheduleMatrix(normalizeScheduleMatrixData(record.schedule_matrix)),
        }))
        setSchedulePresets(normalized)
        setSelectedPresetId((prev) => (prev && normalized.some((preset) => preset.id === prev) ? prev : null))
      } catch (error) {
        if (!cancelled) {
          console.error("No se pudieron cargar las configuraciones de horarios:", error)
          toast({
            title: "No se pudieron cargar los horarios guardados",
            description: "Verifica tu conexión e intenta nuevamente.",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSchedulePresets(false)
        }
      }
    }

    void loadSchedulePresets()

    return () => {
      cancelled = true
    }
  }, [office, toast])

  useEffect(() => {
    if (!office) return

    let cancelled = false

    const loadPositionPresets = async () => {
      setIsLoadingPositionPresets(true)
      try {
        const records = await fetchRolePositionPresets(office.id)
        if (cancelled) return
        const normalized = records.map((record) => ({
          id: record.id,
          name: record.name,
          slots: clonePositionSlots(
            record.slots && typeof record.slots === "object" && record.slots !== null
              ? (record.slots as Record<string, number>)
              : {},
          ),
        }))
        setPositionPresets(normalized)
        setSelectedPositionPresetId((prev) => (prev && normalized.some((preset) => preset.id === prev) ? prev : null))
      } catch (error) {
        if (!cancelled) {
          console.error("No se pudieron cargar las configuraciones de cupos:", error)
          toast({
            title: "No se pudieron cargar los cupos guardados",
            description: "Intenta nuevamente en unos minutos.",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPositionPresets(false)
        }
      }
    }

    void loadPositionPresets()

    return () => {
      cancelled = true
    }
  }, [office, toast])



  useEffect(() => {
    if (!positionSlotsStorageKey || typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(positionSlotsStorageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, number>
        setPositionSlots(clonePositionSlots(parsed))
      }
    } catch (error) {
      console.error("No se pudieron cargar los cupos seleccionados previamente:", error)
    }
  }, [positionSlotsStorageKey])

  useEffect(() => {
    if (!positionSlotsStorageKey || typeof window === "undefined") return
    try {
      window.localStorage.setItem(positionSlotsStorageKey, JSON.stringify(clonePositionSlots(positionSlots)))
    } catch (error) {
      console.error("No se pudieron guardar los cupos seleccionados:", error)
    }
  }, [positionSlots, positionSlotsStorageKey])

  useEffect(() => {
    if (!positionPresetSelectionStorageKey || typeof window === "undefined") return
    try {
      const storedSelection = window.localStorage.getItem(positionPresetSelectionStorageKey)
      if (storedSelection && positionPresets.some((preset) => preset.id === storedSelection)) {
        setSelectedPositionPresetId(storedSelection)
      } else if (storedSelection && positionPresets.length > 0) {
        window.localStorage.removeItem(positionPresetSelectionStorageKey)
        setSelectedPositionPresetId((prev) =>
          prev && positionPresets.some((preset) => preset.id === prev) ? prev : null
        )
      }
    } catch (error) {
      console.error("No se pudo restaurar la selección de cupos:", error)
    }
  }, [positionPresetSelectionStorageKey, positionPresets])

  useEffect(() => {
    if (!attributePresetStorageKey || typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(attributePresetStorageKey)
      setSelectedAttributePresetId(null)
      if (stored) {
        const parsed = JSON.parse(stored) as AttributePreset[]
        const normalized = parsed.map((preset) => ({
          ...preset,
          assignments: Object.fromEntries(
            Object.entries(preset.assignments || {}).map(([attributeId, employeeIds]) => [
              attributeId,
              Array.isArray(employeeIds) ? [...employeeIds] : [],
            ])
          ),
        }))
        setAttributePresets(normalized)
      } else {
        setAttributePresets([])
      }
    } catch (error) {
      console.error("No se pudieron cargar los atributos guardados:", error)
    }
  }, [attributePresetStorageKey])

  useEffect(() => {
    if (!attributePresetStorageKey || typeof window === "undefined") return
    try {
      window.localStorage.setItem(attributePresetStorageKey, JSON.stringify(attributePresets))
    } catch (error) {
      console.error("No se pudieron guardar las configuraciones de atributos:", error)
    }
  }, [attributePresets, attributePresetStorageKey])

  useEffect(() => {
    if (!mealSlotStorageKey || typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(mealSlotStorageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as MealSlotConfig[]
        const allowedUnits = new Set<UnitPositionId>(["OPERATION", "PICKPACK", "CONSULATE"])
        const normalized: MealSlotConfig[] = parsed.map((slot) => {
          const rawUnits = Array.isArray(slot.appliesTo) ? slot.appliesTo : []
          const appliesTo = rawUnits
            .map((unitId) => (allowedUnits.has(unitId as UnitPositionId) ? (unitId as UnitPositionId) : null))
            .filter((value): value is UnitPositionId => value !== null)

          return {
            ...slot,
            appliesTo: appliesTo.length > 0 ? appliesTo : ["OPERATION"],
            enabled: slot.enabled !== false,
          }
        })
        setMealSlots(normalized)
      } else {
        setMealSlots([])
      }
    } catch (error) {
      console.error("No se pudieron cargar los horarios de comida guardados:", error)
    }
  }, [mealSlotStorageKey])

  useEffect(() => {
    if (!mealSlotStorageKey || typeof window === "undefined") return
    try {
      window.localStorage.setItem(mealSlotStorageKey, JSON.stringify(mealSlots))
    } catch (error) {
      console.error("No se pudieron guardar los horarios de comida:", error)
    }
  }, [mealSlots, mealSlotStorageKey])

  useEffect(() => {
    if (!latestSnapshotStorageKey || typeof window === "undefined") return
    try {
      const stored = window.sessionStorage.getItem(latestSnapshotStorageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as RoleSnapshot
        setLatestGeneratedSnapshot(parsed)
      }
    } catch (error) {
      console.error("No se pudo restaurar el último rol generado:", error)
    }
  }, [latestSnapshotStorageKey])

  useEffect(() => {
    if (!latestSnapshotStorageKey || typeof window === "undefined") return
    try {
      if (!latestGeneratedSnapshot) {
        window.sessionStorage.removeItem(latestSnapshotStorageKey)
      } else {
        window.sessionStorage.setItem(latestSnapshotStorageKey, JSON.stringify(latestGeneratedSnapshot))
      }
    } catch (error) {
      console.error("No se pudo guardar el último rol generado:", error)
    }
  }, [latestGeneratedSnapshot, latestSnapshotStorageKey])

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>()
    for (const employee of employees) {
      map.set(employee.id, employee)
    }
    return map
  }, [employees])

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.active !== false && !shouldExcludeFromRoster(employee)),
    [employees]
  )

  const casSchedules = scheduleMatrix.CAS
  const consSchedules = scheduleMatrix.Consulado

  const formatScheduleList = useCallback((values: string[]) => {
    const sanitized = values.map((value) => value.trim()).filter((value) => value.length > 0)
    return sanitized.length > 0 ? sanitized.join(", ") : "-"
  }, [])

  const defaultShiftLabel = useMemo(() => `${startTime} A ${endTime}`.toUpperCase(), [startTime, endTime])

  const employeeAssignments = useMemo(() => {
    const map: Record<string, PositionDefinition> = {}
    for (const position of ALL_POSITIONS) {
      for (const employeeId of assignments[position.id] || []) {
        map[employeeId] = position
      }
    }
    return map
  }, [assignments])

  const assignedEmployeeIds = useMemo(() => new Set(Object.keys(employeeAssignments)), [employeeAssignments])

  const activeEmployeeCount = activeEmployees.length

  useEffect(() => {
    if (isLoadingEmployees) return

    setPositionSlots((prev) => {
      const total = Object.values(prev).reduce((sum, count) => sum + (count || 0), 0)

      if (activeEmployeeCount === 0) {
        if (total === 0) return prev
        const cleared: Record<string, number> = {}
        for (const position of ALL_POSITIONS) {
          cleared[position.id] = 0
        }
        return cleared
      }

      if (total <= activeEmployeeCount) return prev

      const next = { ...prev }
      let excess = total - activeEmployeeCount

      for (const position of [...ALL_POSITIONS].reverse()) {
        if (excess <= 0) break
        const current = next[position.id] || 0
        if (current === 0) continue
        const reduction = Math.min(current, excess)
        next[position.id] = current - reduction
        excess -= reduction
      }

      return next
    })
  }, [activeEmployeeCount, isLoadingEmployees])

  const unassignedEmployees = useMemo(() => {
    return activeEmployees
      .filter((employee) => !assignedEmployeeIds.has(employee.id))
      .sort(sortEmployeesByName)
  }, [activeEmployees, assignedEmployeeIds])

  const sortedActiveEmployees = useMemo(
    () => [...activeEmployees].sort(sortEmployeesByName),
    [activeEmployees]
  )

  const orderedEmployeeIds = useMemo(() => {
    const seen = new Set<string>()
    const order: string[] = []

    const push = (employeeId: string) => {
      if (!seen.has(employeeId)) {
        seen.add(employeeId)
        order.push(employeeId)
      }
    }

    for (const position of ALL_POSITIONS) {
      for (const employeeId of assignments[position.id] || []) {
        push(employeeId)
      }
    }

    for (const employee of [...activeEmployees].sort(sortEmployeesByName)) {
      push(employee.id)
    }

    return order
  }, [assignments, activeEmployees])

  const orderedEmployees = useMemo(() => {
    return orderedEmployeeIds
      .map((id) => employeeMap.get(id))
      .filter((employee): employee is Employee => Boolean(employee))
  }, [employeeMap, orderedEmployeeIds])

  const holidaySet = useMemo(() => new Set(holidayDates), [holidayDates])

  const shortageSummary = useMemo(
    () =>
      UNIT_POSITIONS.map((unit) => ({
        unit,
        count: unitShortages[unit.id as UnitPositionId] || 0,
      })).filter((item) => item.count > 0),
    [unitShortages]
  )

  const getAbsenceScore = useCallback(
    (employeeId: string): number => {
      let score = 0
      for (const day of weekDays) {
        if (holidaySet.has(day.date)) continue
        if (vacationMap[employeeId]?.has(day.date)) {
          score += 1
        }
      }
      return score
    },
    [holidaySet, vacationMap, weekDays]
  )

  const recomputeDailyUnitAssignments = useCallback(
    (
      baseAssignments: Record<string, string[]>,
      slotConfig: Record<string, number>
    ): { dailyAssignments: DailyUnitAssignments; shortages: Record<UnitPositionId, number> } => {
      const shortages: Record<UnitPositionId, number> = {
        OPERATION: 0,
        PICKPACK: 0,
        CONSULATE: 0,
      }
      const result: DailyUnitAssignments = {}

      const operationSlots = slotConfig.OPERATION || 0

      for (const day of weekDays) {
        const dayAssignments: Record<UnitPositionId, string[]> = {
          OPERATION: [],
          PICKPACK: [],
          CONSULATE: [],
        }

        if (holidaySet.has(day.date)) {
          result[day.date] = dayAssignments
          continue
        }

        // Fixed units (Pick & Pack, Consulado)
        for (const unitId of ["PICKPACK", "CONSULATE"] as const) {
          const slotsForUnit = slotConfig[unitId] || 0
          const assigned = (baseAssignments[unitId] || []).slice(0, slotsForUnit)
          dayAssignments[unitId] = assigned

          const availableToday = assigned.filter((employeeId) => !vacationMap[employeeId]?.has(day.date))
          const shortfall = Math.max(slotsForUnit - availableToday.length, 0)
          if (shortfall > shortages[unitId]) {
            shortages[unitId] = shortfall
          }
        }

        // Operation daily rotation
        const operationPool = (baseAssignments.OPERATION || []).filter(
          (employeeId) => !vacationMap[employeeId]?.has(day.date)
        )
        const shuffledPool = shuffleArray(operationPool)
        const assignedToday = shuffledPool.slice(0, operationSlots)
        dayAssignments.OPERATION = assignedToday

        const opShortfall = Math.max(operationSlots - assignedToday.length, 0)
        if (opShortfall > shortages.OPERATION) {
          shortages.OPERATION = opShortfall
        }

        result[day.date] = dayAssignments
      }

      return { dailyAssignments: result, shortages }
    },
    [holidaySet, vacationMap, weekDays]
  )

  const recomputeMealAssignments = useCallback(
    (dailyAssignments: DailyUnitAssignments, slots: MealSlotConfig[]): DailyMealAssignments => {
      if (slots.length === 0 || weekDays.length === 0) return {}

      const assignments: DailyMealAssignments = {}
      const enabledSlots = slots.filter((slot) => slot.enabled && slot.capacity > 0 && slot.appliesTo.length > 0)
      if (enabledSlots.length === 0) return {}

      for (const day of weekDays) {
        const dayKey = day.date
        const unitAssignments = dailyAssignments[dayKey]
        if (!unitAssignments) continue

        assignments[dayKey] = {}
        const usedToday = new Set<string>()

        for (const slot of enabledSlots) {
          const pool = new Set<string>()
          for (const unitId of slot.appliesTo) {
            const unitEmployees = unitAssignments[unitId] || []
            for (const employeeId of unitEmployees) {
              if (!vacationMap[employeeId]?.has(dayKey)) {
                pool.add(employeeId)
              }
            }
          }

          const available = shuffleArray(Array.from(pool)).filter((employeeId) => !usedToday.has(employeeId))
          const selected = available.slice(0, slot.capacity)
          assignments[dayKey][slot.id] = selected
          selected.forEach((employeeId) => usedToday.add(employeeId))
        }
      }

      return assignments
    },
    [vacationMap, weekDays]
  )

  useEffect(() => {
    if (weekDays.length === 0) return
    const { dailyAssignments, shortages } = recomputeDailyUnitAssignments(assignments, positionSlots)
    setDailyUnitAssignments(dailyAssignments)
    setUnitShortages(shortages)
  }, [assignments, positionSlots, recomputeDailyUnitAssignments, weekDays])

  useEffect(() => {
    if (mealSlots.length === 0 || Object.keys(dailyUnitAssignments).length === 0) {
      setDailyMealAssignments({})
      return
    }
    const computed = recomputeMealAssignments(dailyUnitAssignments, mealSlots)
    setDailyMealAssignments(computed)
  }, [dailyUnitAssignments, mealSlots, recomputeMealAssignments])

  const getCellInfo = useCallback(
    (employeeId: string, date: string) => {
      if (holidaySet.has(date)) {
        return { locked: true, base: "FESTIVO" }
      }
      if (vacationMap[employeeId]?.has(date)) {
        return { locked: true, base: "VACACIONES" }
      }

      const unitAssignmentsForDay = dailyUnitAssignments[date]
      if (unitAssignmentsForDay) {
        for (const unit of UNIT_POSITIONS) {
          const assignedIds = unitAssignmentsForDay[unit.id as UnitPositionId] || []
          if (assignedIds.includes(employeeId)) {
            return { locked: false, base: unit.name.toUpperCase() }
          }
        }
      }

      if (employeeAssignments[employeeId]) {
        return { locked: false, base: "LIBRE" }
      }

      return { locked: false, base: "SIN UNIDAD" }
    },
    [dailyUnitAssignments, employeeAssignments, holidaySet, vacationMap]
  )

  const updateScheduleEntry = (area: ScheduleCategory, role: ScheduleRole, index: number, value: string) => {
    setScheduleMatrix((prev) => ({
      ...prev,
      [area]: {
        ...prev[area],
        [role]: prev[area][role].map((entry, entryIndex) => (entryIndex === index ? value : entry)),
      },
    }))
    setSelectedPresetId(null)
  }

  const addScheduleEntry = (area: ScheduleCategory, role: ScheduleRole) => {
    setScheduleMatrix((prev) => ({
      ...prev,
      [area]: {
        ...prev[area],
        [role]: [...prev[area][role], prev[area][role][prev[area][role].length - 1] || ""],
      },
    }))
    setSelectedPresetId(null)
  }

  const removeScheduleEntry = (area: ScheduleCategory, role: ScheduleRole, index: number) => {
    setScheduleMatrix((prev) => {
      if (prev[area][role].length <= 1) return prev
      return {
        ...prev,
        [area]: {
          ...prev[area],
          [role]: prev[area][role].filter((_, entryIndex) => entryIndex !== index),
        },
      }
    })
    setSelectedPresetId(null)
  }

  const handleApplySchedulePreset = (presetId: string) => {
    const preset = schedulePresets.find((item) => item.id === presetId)
    if (!preset) return
    setSelectedPresetId(presetId)
    setShiftName(preset.shiftName)
    setStartTime(preset.startTime)
    setEndTime(preset.endTime)
    setScheduleMatrix(cloneScheduleMatrix(preset.scheduleMatrix))
    setIsRoleGenerated(false)
  }

  const handleDeleteSchedulePreset = async (presetId: string) => {
    if (deletingSchedulePresetId) return
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("¿Eliminar esta configuración guardada?")
      if (!confirmed) return
    }

    setDeletingSchedulePresetId(presetId)
    try {
      await deleteRoleSchedulePreset(presetId)
      setSchedulePresets((prev) => prev.filter((preset) => preset.id !== presetId))
      setSelectedPresetId((current) => (current === presetId ? null : current))
      toast({
        title: "Configuración eliminada",
        description: "Los horarios guardados ya no estarán disponibles para futuras sesiones.",
      })
    } catch (error) {
      console.error(`No se pudo eliminar la configuración de horarios ${presetId}:`, error)
      toast({
        title: "Error al eliminar",
        description: "Intenta nuevamente en unos minutos.",
        variant: "destructive",
      })
    } finally {
      setDeletingSchedulePresetId((current) => (current === presetId ? null : current))
    }
  }

  const handleConfirmSaveSchedulePreset = async () => {
    const normalizedName = presetName.trim()
    if (!normalizedName) {
      toast({
        title: "Asigna un nombre",
        description: "Ingresa un nombre para identificar esta configuración.",
        variant: "destructive",
      })
      return
    }

    if (!office) {
      toast({
        title: "Error de oficina",
        description: "No se pudo identificar la oficina para guardar la configuración.",
        variant: "destructive",
      })
      return
    }

    if (isSavingSchedulePreset) return

    setIsSavingSchedulePreset(true)

    const snapshotMatrix = cloneScheduleMatrix(scheduleMatrix)
    const existing = schedulePresets.find((preset) => preset.name.toLowerCase() === normalizedName.toLowerCase())

    try {
      if (existing) {
        await deleteRoleSchedulePreset(existing.id)
      }

      const record = await insertRoleSchedulePreset(office.id, {
        name: normalizedName,
        shiftName,
        startTime,
        endTime,
        scheduleMatrix: snapshotMatrix,
      })

      const savedPreset: SchedulePreset = {
        id: record.id,
        name: record.name,
        shiftName: record.shift_name,
        startTime: record.start_time,
        endTime: record.end_time,
        scheduleMatrix: cloneScheduleMatrix(normalizeScheduleMatrixData(record.schedule_matrix)),
      }

      setSchedulePresets((prev) => {
        const filtered = prev.filter((preset) => preset.id !== existing?.id)
        return [savedPreset, ...filtered]
      })
      setSelectedPresetId(savedPreset.id)
      setIsSaveScheduleModalOpen(false)
      setPresetName("")
      toast({
        title: "Configuración guardada",
        description: "Ahora puedes reutilizar estos horarios en futuros roles.",
      })
    } catch (error) {
      console.error("No se pudo guardar la configuración de horarios:", error)
      toast({
        title: "Error al guardar",
        description: "Intenta nuevamente en unos minutos.",
        variant: "destructive",
      })
    } finally {
      setIsSavingSchedulePreset(false)
    }
  }

  const enforceSlotCapacity = useCallback(
    (
      desiredSlots: Record<string, number>,
    ): { slots: Record<string, number>; trimmed: boolean; removedCount: number; finalTotal: number } => {
      const sanitized = clonePositionSlots(desiredSlots)
      const initialTotal = Object.values(sanitized).reduce((sum, count) => sum + (count || 0), 0)

      if (activeEmployeeCount <= 0) {
        const cleared = createDefaultPositionSlots()
        return {
          slots: cleared,
          trimmed: initialTotal > 0,
          removedCount: initialTotal,
          finalTotal: 0,
        }
      }

      if (initialTotal <= activeEmployeeCount) {
        return {
          slots: sanitized,
          trimmed: false,
          removedCount: 0,
          finalTotal: initialTotal,
        }
      }

      let excess = initialTotal - activeEmployeeCount
      const adjusted = { ...sanitized }
      const reductionPriority: string[] = [
        "OPERATION",
        ...ALL_POSITIONS.map((position) => position.id).filter((positionId) => positionId !== "OPERATION"),
      ]

      for (const positionId of reductionPriority) {
        if (excess <= 0) break
        const current = adjusted[positionId] || 0
        if (current === 0) continue
        const reduction = Math.min(current, excess)
        adjusted[positionId] = current - reduction
        excess -= reduction
      }

      const finalTotal = Object.values(adjusted).reduce((sum, count) => sum + (count || 0), 0)
      const removedCount = Math.max(initialTotal - finalTotal, 0)

      return {
        slots: adjusted,
        trimmed: removedCount > 0,
        removedCount,
        finalTotal,
      }
    },
    [activeEmployeeCount],
  )

  const handleSlotChange = (positionId: string, value: string) => {
    const parsed = Number.parseInt(value, 10)
    const sanitized = Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
    const currentValue = positionSlots[positionId] ?? 0
    if (currentValue === sanitized) return

    const nextSlots = { ...positionSlots, [positionId]: sanitized }
    const nextTotal = Object.values(nextSlots).reduce((sum, count) => sum + (count || 0), 0)

    if (nextTotal > activeEmployeeCount) {
      toast({
        title: activeEmployeeCount === 0 ? "Sin colaboradores activos" : "Límite de puestos alcanzado",
        description:
          activeEmployeeCount === 0
            ? "Registra al menos un colaborador activo antes de abrir puestos."
            : `Solo hay ${activeEmployeeCount} colaborador(es) activos disponibles.`,
        variant: "destructive",
      })
      return
    }

    setPositionSlots(nextSlots)
    setIsRoleGenerated(false)
    setSelectedPositionPresetId(null)
    if (positionPresetSelectionStorageKey && typeof window !== "undefined") {
      window.localStorage.removeItem(positionPresetSelectionStorageKey)
    }
  }

  const handleAssignEmployeeToPosition = (positionId: string, employeeId: string) => {
    if (!employeeId) return

    const positionInfo = ALL_POSITIONS.find((position) => position.id === positionId)
    if (!positionInfo) return

    const requiredCount = positionSlots[positionId] || 0
    if (requiredCount === 0) {
      toast({
        title: "Configura puestos disponibles",
        description: `Agrega al menos un puesto en ${positionInfo.name} antes de asignar personal.`,
        variant: "destructive",
      })
      return
    }

    const selectedEmployee = employeeMap.get(employeeId)
    if (!isEmployeeEligibleForPosition(selectedEmployee, positionId)) {
      toast({
        title: "Asignación no permitida",
        description: isSupervisorPositionId(positionId)
          ? "Solo el personal con rol de supervisor puede ocupar este puesto."
          : "Los supervisores únicamente pueden asignarse a puestos de supervisión.",
        variant: "destructive",
      })
      return
    }

    const displayName = getEmployeeDisplayName(selectedEmployee)
    let applied = false

    setAssignments((prev) => {
      const next: Record<string, string[]> = {}

      for (const position of ALL_POSITIONS) {
        const current = prev[position.id] || []
        next[position.id] = current.filter((id) => id !== employeeId)
      }

      const existing = next[positionId] || []
      const hasCapacity = positionId === "OPERATION" || existing.length < requiredCount
      if (!hasCapacity) {
        return prev
      }

      next[positionId] = [...existing, employeeId]
      applied = true
      return next
    })

    if (!applied) {
      toast({
        title: "Sin espacios disponibles",
        description: `Incrementa los puestos de ${positionInfo.name} para asignar a ${displayName}.`,
        variant: "destructive",
      })
      return
    }

    setIsRoleGenerated(false)
    setSelectedPositionPresetId(null)
    if (positionPresetSelectionStorageKey && typeof window !== "undefined") {
      window.localStorage.removeItem(positionPresetSelectionStorageKey)
    }

    toast({
      title: "Colaborador asignado",
      description: `${displayName} quedó registrado en ${positionInfo.name}.`,
    })
  }

  const handleRemoveAssignment = (positionId: string, employeeId: string) => {
    setAssignments((prev) => {
      const next = { ...prev }
      next[positionId] = (prev[positionId] || []).filter((id) => id !== employeeId)
      return next
    })
    setIsRoleGenerated(false)
  }

  const handleAttributeToggle = (attributeId: string, employeeId: string, checked: boolean | string) => {
    const isChecked = checked === true

    setIsRoleGenerated(false)
    setAttributes((prev) =>
      prev.map((attribute) => {
        if (attribute.id !== attributeId) return attribute

        const nextIds = new Set(attribute.employeeIds)
        if (isChecked) {
          nextIds.add(employeeId)
        } else {
          nextIds.delete(employeeId)
        }

        const orderedIds = Array.from(nextIds).sort((a, b) => {
          const employeeA = employeeMap.get(a)
          const employeeB = employeeMap.get(b)
          return getEmployeeDisplayName(employeeA).localeCompare(
            getEmployeeDisplayName(employeeB),
            "es"
          )
        })

        return { ...attribute, employeeIds: orderedIds }
      })
    )
  }

  const autoAssignEmployees = (options?: {
    successToast?: { title: string; description?: string } | null
  }): boolean => {
    const totalSlots = Object.values(positionSlots).reduce((sum, count) => sum + (count || 0), 0)

    if (totalSlots === 0) {
      toast({
        title: "Define cupos",
        description: "Indica al menos un cupo en alguna unidad antes de asignar empleados.",
        variant: "destructive",
      })
      return false
    }

    if (activeEmployeeCount === 0) {
      toast({
        title: "Sin colaboradores activos",
        description: "No hay personal disponible para asignar en este momento.",
        variant: "destructive",
      })
      return false
    }

    const nextAssignments = createEmptyAssignments()
    const usedEmployeeIds = new Set<string>()

    for (const position of ALL_POSITIONS) {
      const requiredCount = positionSlots[position.id] || 0
      const current = assignments[position.id] || []
      const eligibleCurrent = current.filter((employeeId) => {
        const employee = employeeMap.get(employeeId)
        return isEmployeeEligibleForPosition(employee, position.id)
      })

      const capacity = position.id === "OPERATION" ? Number.MAX_SAFE_INTEGER : requiredCount
      const trimmed = capacity === Number.MAX_SAFE_INTEGER ? eligibleCurrent : eligibleCurrent.slice(0, capacity)
      nextAssignments[position.id] = trimmed
      trimmed.forEach((employeeId) => usedEmployeeIds.add(employeeId))
    }

    const remainingEmployees = activeEmployees.filter((employee) => !usedEmployeeIds.has(employee.id))

    const sortedRemaining = [...remainingEmployees].sort((a, b) => {
      const diff = getAbsenceScore(a.id) - getAbsenceScore(b.id)
      if (diff !== 0) return diff
      return getEmployeeDisplayName(a).localeCompare(getEmployeeDisplayName(b), "es")
    })

    const shuffleAndPick = <T,>(items: T[], count: number): { selected: T[]; remaining: T[] } => {
      if (count <= 0) return { selected: [], remaining: items }
      const shuffled = shuffleArray(items)
      const selected = shuffled.slice(0, Math.min(count, shuffled.length))
      const remaining = shuffled.filter((item) => !selected.includes(item))
      return { selected, remaining }
    }

    let supervisorPool = sortedRemaining.filter((employee) => isSupervisorEmployee(employee))
    let nonSupervisorPool = sortedRemaining.filter((employee) => !isSupervisorEmployee(employee))

    const shortages: Record<UnitPositionId, number> = {
      OPERATION: 0,
      PICKPACK: 0,
      CONSULATE: 0,
    }
    let supervisorShortage = 0

    for (const position of SUPERVISOR_POSITIONS) {
      const required = positionSlots[position.id] || 0
      const existing = nextAssignments[position.id]
      const needed = Math.max(required - existing.length, 0)
      if (needed === 0) continue

      const { selected, remaining } = shuffleAndPick(supervisorPool, needed)
      nextAssignments[position.id] = [...existing, ...selected.map((employee) => employee.id)]
      supervisorPool = remaining
      selected.forEach((employee) => usedEmployeeIds.add(employee.id))

      if (selected.length < needed) {
        supervisorShortage += needed - selected.length
      }
    }

    for (const position of UNIT_POSITIONS) {
      if (position.id === "OPERATION") continue
      const required = positionSlots[position.id] || 0
      const existing = nextAssignments[position.id]
      const needed = Math.max(required - existing.length, 0)
      if (needed === 0) continue

      const { selected, remaining } = shuffleAndPick(nonSupervisorPool, needed)
      nextAssignments[position.id] = [...existing, ...selected.map((employee) => employee.id)]
      nonSupervisorPool = remaining
      selected.forEach((employee) => usedEmployeeIds.add(employee.id))

      if (selected.length < needed) {
        const unitId = position.id as UnitPositionId
        shortages[unitId] = needed - selected.length
      }
    }

    const operationRequired = positionSlots.OPERATION || 0
    const currentOperation = nextAssignments.OPERATION || []
    const { selected: operationSelected, remaining: remainingAfterOperation } = shuffleAndPick(
      nonSupervisorPool,
      Math.max(operationRequired - currentOperation.length, 0)
    )
    nonSupervisorPool = remainingAfterOperation

    const operationSet = new Set<string>([...currentOperation, ...operationSelected.map((employee) => employee.id)])
    nonSupervisorPool.forEach((employee) => operationSet.add(employee.id))
    nextAssignments.OPERATION = Array.from(operationSet)

    setAssignments(nextAssignments)
    setIsRoleGenerated(false)
    setSelectedPositionPresetId(null)
    if (positionPresetSelectionStorageKey && typeof window !== "undefined") {
      window.localStorage.removeItem(positionPresetSelectionStorageKey)
    }

    const { dailyAssignments, shortages: computedShortages } = recomputeDailyUnitAssignments(
      nextAssignments,
      positionSlots
    )
    const mergedShortages: Record<UnitPositionId, number> = { ...shortages }
    for (const unitId of Object.keys(computedShortages) as UnitPositionId[]) {
      mergedShortages[unitId] = Math.max(mergedShortages[unitId] || 0, computedShortages[unitId])
    }
    setDailyUnitAssignments(dailyAssignments)
    setUnitShortages(mergedShortages)

    const mealAssignments = recomputeMealAssignments(dailyAssignments, mealSlots)
    setDailyMealAssignments(mealAssignments)

    if (supervisorShortage > 0) {
      toast({
        title: "Supervisores insuficientes",
        description: `Faltan ${supervisorShortage} puesto(s) de supervisión por cubrir.`,
        variant: "destructive",
      })
    } else {
      const successToast = options?.successToast ?? {
        title: "Asignación actualizada",
        description: "Se recalcularon las unidades y la rotación diaria de operación.",
      }
      if (successToast) {
        toast(successToast)
      }
    }

    return true
  }

  const handleAutoAssign = () => {
    autoAssignEmployees()
  }

  const handleApplyPositionPreset = (presetId: string) => {
    const preset = positionPresets.find((item) => item.id === presetId)
    if (!preset) return

    const { slots: sanitizedSlots, trimmed, removedCount, finalTotal } = enforceSlotCapacity(preset.slots)

    setPositionSlots(sanitizedSlots)
    setIsRoleGenerated(false)

    if (activeEmployeeCount <= 0) {
      setSelectedPositionPresetId(null)
      if (positionPresetSelectionStorageKey && typeof window !== "undefined") {
        window.localStorage.removeItem(positionPresetSelectionStorageKey)
      }
      toast({
        title: "Sin colaboradores activos",
        description: "Los cupos guardados se limpiaron porque no hay personal disponible actualmente.",
        variant: "destructive",
      })
      return
    }

    setSelectedPositionPresetId(presetId)
    if (positionPresetSelectionStorageKey && typeof window !== "undefined") {
      window.localStorage.setItem(positionPresetSelectionStorageKey, presetId)
    }

    if (trimmed) {
      const removedLabel = removedCount === 1 ? "1 puesto" : `${removedCount} puestos`
      toast({
        title: "Cupos ajustados",
        description: `Se redujeron ${removedLabel} para coincidir con los ${activeEmployeeCount} colaboradores activos.`,
      })
      return
    }

    toast({
      title: "Cupos aplicados",
      description: `Se cargó la configuración "${preset.name}" con ${finalTotal} puesto(s).`,
    })
  }

  const handleDeletePositionPreset = async (presetId: string) => {
    if (deletingPositionPresetId) return
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("¿Eliminar esta configuración de cupos?")
      if (!confirmed) return
    }

    setDeletingPositionPresetId(presetId)
    try {
      await deleteRolePositionPreset(presetId)
      setPositionPresets((prev) => prev.filter((preset) => preset.id !== presetId))
      setSelectedPositionPresetId((current) => (current === presetId ? null : current))
      if (positionPresetSelectionStorageKey && typeof window !== "undefined") {
        const current = window.localStorage.getItem(positionPresetSelectionStorageKey)
        if (current === presetId) {
          window.localStorage.removeItem(positionPresetSelectionStorageKey)
        }
      }
      toast({
        title: "Configuración eliminada",
        description: "Los cupos guardados ya no estarán disponibles.",
      })
    } catch (error) {
      console.error(`No se pudo eliminar la configuración de cupos ${presetId}:`, error)
      toast({
        title: "Error al eliminar",
        description: "Intenta nuevamente en unos minutos.",
        variant: "destructive",
      })
    } finally {
      setDeletingPositionPresetId((current) => (current === presetId ? null : current))
    }
  }

  const handleConfirmSavePositionPreset = async () => {
    const normalizedName = positionPresetName.trim()
    if (!normalizedName) {
      toast({
        title: "Asigna un nombre",
        description: "Especifica un nombre para identificar esta configuración de puestos.",
        variant: "destructive",
      })
      return
    }

    if (!office) {
      toast({
        title: "Error de oficina",
        description: "No se pudo identificar la oficina para guardar la configuración.",
        variant: "destructive",
      })
      return
    }

    if (isSavingPositionPreset) return

    setIsSavingPositionPreset(true)

    const snapshot = clonePositionSlots(positionSlots)
    const existing = positionPresets.find((preset) => preset.name.toLowerCase() === normalizedName.toLowerCase())

    try {
      if (existing) {
        await deleteRolePositionPreset(existing.id)
      }

      const record = await insertRolePositionPreset(office.id, {
        name: normalizedName,
        slots: snapshot,
      })

      const savedPreset: PositionPreset = {
        id: record.id,
        name: record.name,
        slots: clonePositionSlots(
          record.slots && typeof record.slots === "object" && record.slots !== null
            ? (record.slots as Record<string, number>)
            : {},
        ),
      }

      setPositionPresets((prev) => {
        const filtered = prev.filter((preset) => preset.id !== existing?.id)
        return [savedPreset, ...filtered]
      })
      setSelectedPositionPresetId(savedPreset.id)
      if (positionPresetSelectionStorageKey && typeof window !== "undefined") {
        window.localStorage.setItem(positionPresetSelectionStorageKey, savedPreset.id)
      }
      setPositionPresetName("")
      setIsSavePositionPresetModalOpen(false)
      toast({
        title: "Cupos guardados",
        description: "Ahora puedes reutilizar esta distribución de puestos cuando lo necesites.",
      })
    } catch (error) {
      console.error("No se pudo guardar la configuración de cupos:", error)
      toast({
        title: "Error al guardar",
        description: "Intenta nuevamente en unos minutos.",
        variant: "destructive",
      })
    } finally {
      setIsSavingPositionPreset(false)
    }
  }

  const handleClearAssignments = () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "¿Deseas limpiar todas las asignaciones, atributos y horarios personalizados?"
      )
      if (!confirmed) return
    }

    setAssignments(createEmptyAssignments())
    setScheduleOverrides({})
    setAttributes((prev) => prev.map((attribute) => ({ ...attribute, employeeIds: [] })))
    setIsRoleGenerated(false)
    if (positionPresetSelectionStorageKey && typeof window !== "undefined") {
      window.localStorage.removeItem(positionPresetSelectionStorageKey)
    }
    if (positionSlotsStorageKey && typeof window !== "undefined") {
      window.localStorage.removeItem(positionSlotsStorageKey)
    }

    toast({
      title: "Rol reiniciado",
      description: "Se limpiaron las asignaciones y ajustes personalizados",
    })
  }

  const handlePrint = () => {
    if (typeof window === "undefined") return
    window.print()
  }

  const totalRequiredSlots = useMemo(
    () => Object.values(positionSlots).reduce((sum, count) => sum + (count || 0), 0),
    [positionSlots]
  )

  const assignedCount = useMemo(
    () => Object.values(assignments).reduce((sum, employeeIds) => sum + employeeIds.length, 0),
    [assignments]
  )

  const slotBalance = useMemo(
    () => activeEmployeeCount - totalRequiredSlots,
    [activeEmployeeCount, totalRequiredSlots]
  )

  const pendingEmployees = useMemo(
    () => Math.max(activeEmployeeCount - assignedCount, 0),
    [activeEmployeeCount, assignedCount]
  )

  const weekRangeLabel = useMemo(() => formatWeekRange(weekDays), [weekDays])

  const weekNumber = useMemo(() => {
    if (weekDays.length === 0) return undefined
    return getISOWeekNumber(parseISODate(weekDays[0].date))
  }, [weekDays])

  const buildRoleSnapshot = useCallback((): RoleSnapshot => {
    if (!office) {
      throw new Error("No se encontró la oficina para el rol generado")
    }

    const attributeColumns = attributes.map(({ id, label }) => ({ id, label }))

    const attributeInfoByEmployee: Record<string, { ids: string[]; labels: string[] }> = {}
    attributes.forEach((attribute) => {
      attribute.employeeIds.forEach((employeeId) => {
        if (!attributeInfoByEmployee[employeeId]) {
          attributeInfoByEmployee[employeeId] = { ids: [], labels: [] }
        }
        attributeInfoByEmployee[employeeId].ids.push(attribute.id)
        attributeInfoByEmployee[employeeId].labels.push(attribute.label)
      })
    })

    const assignmentsSnapshot: SavedRoleAssignment[] = []
    for (const employee of orderedEmployees) {
      const assignment = employeeAssignments[employee.id]
      if (!assignment) continue

      const attributeInfo = attributeInfoByEmployee[employee.id] || { ids: [], labels: [] }
      const dayEntries = weekDays.map((day) => {
        const cellInfo = getCellInfo(employee.id, day.date)
        const overrideValue = scheduleOverrides[employee.id]?.[day.date] ?? ""
        const displayValue = cellInfo.locked
          ? cellInfo.base
          : overrideValue.trim().length > 0
            ? overrideValue
            : cellInfo.base

        return {
          date: day.date,
          label: day.label,
          displayValue,
          locked: cellInfo.locked,
          base: cellInfo.base,
        }
      })

      assignmentsSnapshot.push({
        employeeId: employee.id,
        displayName: getEmployeeDisplayName(employee),
        employeeCode: employee.employee_code || undefined,
        status: employee.position || undefined,
        position: {
          id: assignment.id,
          code: assignment.code,
          name: assignment.name,
        },
        attributeIds: attributeInfo.ids,
        attributeLabels: attributeInfo.labels,
        dayEntries,
      })
    }

    const snapshotId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`

    return {
      id: snapshotId,
      createdAt: new Date().toISOString(),
      officeId: office.id,
      officeName: office.name,
      weekStartDate,
      weekNumber,
      weekRangeLabel,
      shiftName,
      startTime,
      endTime,
      notes,
      defaultShiftLabel,
      scheduleMatrix: cloneScheduleMatrix(scheduleMatrix),
      weekDays: weekDays.map((day) => ({ ...day })),
      totalEmployees: activeEmployeeCount,
      totalPositions: totalRequiredSlots,
      attributeColumns,
      assignments: assignmentsSnapshot,
    }
  }, [
    office,
    attributes,
    orderedEmployees,
    employeeAssignments,
    weekDays,
    getCellInfo,
    scheduleOverrides,
    weekStartDate,
    weekNumber,
    weekRangeLabel,
    shiftName,
    startTime,
    endTime,
    notes,
    defaultShiftLabel,
    scheduleMatrix,
    activeEmployeeCount,
    totalRequiredSlots,
  ])

  const handleConfirmSaveRole = () => {
    if (!latestGeneratedSnapshot) return
    if (isLatestSnapshotPersisted) {
      toast({
        title: "Rol ya registrado",
        description: "La versión temporal ya está disponible en el historial.",
      })
      return
    }

    setSavedRoles((prev) => [latestGeneratedSnapshot, ...prev])
    toast({
      title: "Rol guardado",
      description: `Semana ${latestGeneratedSnapshot.weekNumber ? `#${latestGeneratedSnapshot.weekNumber}` : "sin número"} almacenada en historial.`,
    })
  }

  const handleGenerateRole = () => {
    if (activeEmployeeCount === 0) {
      toast({
        title: "Sin colaboradores activos",
        description: "Registra al menos un empleado activo antes de generar el rol.",
        variant: "destructive",
      })
      return
    }

    const success = autoAssignEmployees({ successToast: null })
    if (!success) return

    setShouldFinalizeGeneration(true)
  }

  useEffect(() => {
    if (!shouldFinalizeGeneration) return

    const remainingMissingPositions = ALL_POSITIONS.filter((position) => {
      const requiredCount = positionSlots[position.id] || 0
      if (requiredCount === 0) return false
      const assignedCountForPosition = assignments[position.id]?.length || 0
      return assignedCountForPosition < requiredCount
    })

    if (remainingMissingPositions.length > 0) {
      const missingLabels = remainingMissingPositions.map((position) => position.code).join(", ")
      toast({
        title: "Puestos sin cubrir",
        description: `Completa los puestos: ${missingLabels}`,
        variant: "destructive",
      })
      setShouldFinalizeGeneration(false)
      return
    }

    setIsRoleGenerated(true)

    try {
      const snapshot = buildRoleSnapshot()
      setLatestGeneratedSnapshot(snapshot)
      toast({
        title: "Rol generado y almacenado",
        description: "Guardamos una copia temporal. Si generas otro rol, reemplazaremos esta versión.",
      })
    } catch (error) {
      console.error("No se pudo preparar el snapshot del rol:", error)
    } finally {
      setShouldFinalizeGeneration(false)
    }
  }, [assignments, buildRoleSnapshot, positionSlots, shouldFinalizeGeneration, toast])

  const updateScheduleOverride = (employeeId: string, date: string, value: string) => {
    setScheduleOverrides((prev) => {
      const next = { ...prev }
      const employeeOverrides = { ...(next[employeeId] || {}) }
      const trimmed = value.toUpperCase()
      if (trimmed.trim().length > 0) {
        employeeOverrides[date] = trimmed
      } else {
        delete employeeOverrides[date]
      }
      if (Object.keys(employeeOverrides).length > 0) {
        next[employeeId] = employeeOverrides
      } else {
        delete next[employeeId]
      }
      return next
    })
  }

  if (!office) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Card className="max-w-md shadow-sm">
          <CardHeader>
            <CardTitle>Oficina no encontrada</CardTitle>
            <CardDescription>Verifica el identificador en la URL.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <OfficeHeader office={office} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-indigo-100 p-3 text-indigo-600">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Generador de Rol Operativo</h1>
              <p className="text-sm text-muted-foreground">
                Asigna puestos operativos, agrega atributos especiales y genera un formato listo para impresión considerando vacaciones y días festivos.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setIsSavedRolesModalOpen(true)}>
              <History className="mr-2 h-4 w-4" /> Historial de roles
            </Button>
            <Button variant="outline" onClick={handleClearAssignments}>
              Reiniciar rol
            </Button>
            <Button variant="outline" onClick={handleAutoAssign}>
              <Shuffle className="mr-2 h-4 w-4" /> Asignación aleatoria
            </Button>
            <Button onClick={handleGenerateRole} className="bg-indigo-600 hover:bg-indigo-700">
              Generar rol
            </Button>
            {isRoleGenerated ? (
              <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700">
                <Printer className="mr-2 h-4 w-4" /> Imprimir rol
              </Button>
            ) : null}
          </div>
        </section>

        <section className="flex flex-col gap-4 md:flex-row">
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm md:flex-1"
            onClick={() => setIsGeneralModalOpen(true)}
          >
            <span className="text-sm font-semibold text-slate-800">Datos generales del rol</span>
            <span className="text-xs text-muted-foreground">
              Semana #{weekNumber ?? "-"} • {weekRangeLabel || "Sin definir"}
            </span>
            <span className="text-xs text-muted-foreground">Haz clic para editar fecha, horarios y notas.</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-start gap-2 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm md:flex-1"
            onClick={() => setIsOperationalModalOpen(true)}
          >
            <span className="text-sm font-semibold text-slate-800">Configuración operativa</span>
            <span className="text-xs text-muted-foreground">
              {totalRequiredSlots} puestos • {assignedCount} asignaciones actuales
            </span>
            <span className="text-xs text-muted-foreground">Accede a cupos, atributos y personal fijo.</span>
          </Button>

          {unassignedEmployees.length > 0 ? (
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 text-left text-amber-700 shadow-sm md:flex-1"
              onClick={() => setIsUnassignedModalOpen(true)}
            >
              <span className="text-sm font-semibold">Empleados sin puesto asignado</span>
              <span className="text-xs uppercase tracking-wide">
                {unassignedEmployees.length} colaborador(es) pendientes
              </span>
              <span className="text-xs">Presiona para consultar la lista de pendientes.</span>
            </Button>
          ) : null}
        </section>

        {!isRoleGenerated && latestGeneratedSnapshot ? (
          <Card className="border-indigo-100 bg-indigo-50/60 text-slate-800 print:hidden">
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide">Rol guardado temporalmente</p>
                <p className="text-sm">
                  Semana {latestGeneratedSnapshot.weekNumber ? `#${latestGeneratedSnapshot.weekNumber}` : "sin definir"} • {latestGeneratedSnapshot.weekRangeLabel || "Sin definir"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Generado el {new Date(latestGeneratedSnapshot.createdAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={handleConfirmSaveRole}
                  disabled={isLatestSnapshotPersisted}
                >
                  {isLatestSnapshotPersisted ? "Ya en historial" : "Guardar en historial"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {isRoleGenerated ? (
          <>
            {latestGeneratedSnapshot ? (
              <Alert className="mb-4 border-indigo-200 bg-indigo-50 text-slate-800 print:hidden">
                <AlertTitle>Rol guardado temporalmente</AlertTitle>
                <AlertDescription>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p>
                        Semana {latestGeneratedSnapshot.weekNumber ? `#${latestGeneratedSnapshot.weekNumber}` : "sin definir"} • {latestGeneratedSnapshot.weekRangeLabel || "Sin definir"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Generado el {new Date(latestGeneratedSnapshot.createdAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}
            <Card className="border-indigo-100 bg-white shadow-sm print:border print:border-slate-200 print:shadow-none">
              <CardHeader>
                <CardTitle>Resumen semanal listo para impresión</CardTitle>
                <CardDescription>
                  Incluye horario sugerido, vacaciones y festivos detectados automáticamente.
                  {isLoadingCalendar ? (
                    <span className="ml-2 inline-flex items-center gap-2 text-xs text-indigo-600">
                      <Loader2 className="h-3 w-3 animate-spin" /> Actualizando calendario...
                    </span>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Oficina</p>
                  <p className="font-semibold text-slate-800">{office.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Semana</p>
                  <p className="font-semibold text-slate-800">
                    {weekNumber ? `#${weekNumber}` : "Sin definir"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Rango</p>
                  <p className="font-semibold text-slate-800">{weekRangeLabel || "Sin definir"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Horario base</p>
                  <p className="font-semibold text-slate-800">{defaultShiftLabel}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Horarios CAS</p>
                  <p className="font-semibold text-slate-800">
                    Supervisores: {formatScheduleList(casSchedules.supervisors)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Colaboradores: {formatScheduleList(casSchedules.employees)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Horarios Consulado</p>
                  <p className="font-semibold text-slate-800">
                    Supervisores: {formatScheduleList(consSchedules.supervisors)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Colaboradores: {formatScheduleList(consSchedules.employees)}
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold uppercase text-slate-700">Resumen rápido:</span> {activeEmployees.length} empleados activos • {totalRequiredSlots} puestos configurados
              </div>

              {shortageSummary.length > 0 ? (
                <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                  <AlertTitle>Vacantes sin cubrir</AlertTitle>
                  <AlertDescription>
                    {shortageSummary
                      .map(({ unit, count }) => `${unit.name}: ${count} vacante${count === 1 ? "" : "s"}`)
                      .join(" • ")}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="overflow-x-auto print:overflow-visible">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-3">Nombre</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Puesto rol</th>
                      {weekDays.map((day) => (
                        <th key={day.date} className="px-3 py-3">
                          <div className="flex flex-col">
                            <span>{day.label.toUpperCase()}</span>
                            <span className="text-[10px] text-muted-foreground">{day.dayNumber}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {orderedEmployees.map((employee) => {
                      const assignment = employeeAssignments[employee.id]
                      const toneClasses = getPositionToneClasses(assignment?.id)
                      const rowClassName = toneClasses.rowBg ? `align-top ${toneClasses.rowBg} print:bg-white` : "align-top"
                      return (
                        <tr key={employee.id} className={rowClassName}>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-800 uppercase tracking-wide text-xs">
                              {getEmployeeDisplayName(employee)}
                            </div>
                            {employee.employee_code ? (
                              <div className="text-[10px] uppercase text-muted-foreground">
                                Código {employee.employee_code}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-xs uppercase text-slate-600">
                            {employee.position || "---"}
                          </td>
                          <td className="px-3 py-2 text-xs uppercase text-slate-700">
                            {assignment ? (
                              <span
                                className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${toneClasses.badge}`}
                              >
                                {assignment.code} • {assignment.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Sin puesto</span>
                            )}
                          </td>
                          {weekDays.map((day) => {
                            const cellInfo = getCellInfo(employee.id, day.date)
                            const overrideValue = scheduleOverrides[employee.id]?.[day.date] ?? ""
                            const effectiveDisplay = cellInfo.locked
                              ? cellInfo.base
                              : overrideValue.trim().length > 0
                                ? overrideValue
                                : cellInfo.base

                            return (
                              <td key={day.date} className="px-3 py-2 text-xs text-slate-700">
                                <div className="hidden print:block font-semibold uppercase tracking-wide">
                                  {effectiveDisplay}
                                </div>
                                {cellInfo.locked ? (
                                  <div className="flex flex-col items-start gap-1 print:hidden">
                                    <Badge variant="secondary" className="uppercase">
                                      {cellInfo.base}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">
                                      Calendario automático
                                    </span>
                                  </div>
                                ) : (
                                  <Input
                                    value={overrideValue}
                                    placeholder={cellInfo.base}
                                    onChange={(event) => updateScheduleOverride(employee.id, day.date, event.target.value)}
                                    className="h-9 text-[11px] uppercase print:hidden"
                                  />
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {notes.trim() ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Notas internas
                  </p>
                  <p className="text-sm text-slate-700">{notes}</p>
                </div>
              ) : null}
              </CardContent>
            </Card>
            {mealSlots.filter((slot) => slot.enabled && slot.appliesTo.length > 0 && slot.capacity > 0).length > 0 ? (
              <Card className="border-emerald-100 bg-white shadow-sm print:border print:border-slate-200 print:shadow-none">
                <CardHeader>
                  <CardTitle>Rol de comidas</CardTitle>
                  <CardDescription>
                    Distribución aleatoria de horarios de comida por día considerando unidades elegibles.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {weekDays.map((day) => {
                    const dayAssignments = dailyMealAssignments[day.date] || {}
                    const activeSlots = mealSlots.filter((slot) => slot.enabled && slot.appliesTo.length > 0 && slot.capacity > 0)
                    if (activeSlots.length === 0) return null
                    return (
                      <div key={day.date} className="space-y-2">
                        <p className="text-sm font-semibold text-slate-800">
                          {day.label} {day.dayNumber}
                        </p>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {activeSlots.map((slot) => {
                            const assignedIds = dayAssignments[slot.id] || []
                            const assignedNames = assignedIds.map((employeeId) => getEmployeeDisplayName(employeeMap.get(employeeId)))
                            const vacancies = Math.max(slot.capacity - assignedIds.length, 0)
                            return (
                              <div key={`${day.date}-${slot.id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <p className="text-xs font-semibold uppercase text-slate-600">
                                  {slot.label || `${slot.startTime} - ${slot.endTime}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Cupo: {slot.capacity} • Aplica a {slot.appliesTo.map((unitId) => UNIT_POSITIONS.find((unit) => unit.id === unitId)?.name || unitId).join(", ")}
                                </p>
                                {assignedNames.length > 0 ? (
                                  <ul className="mt-2 space-y-1 text-xs text-slate-700">
                                    {assignedNames.map((name) => (
                                      <li key={`${day.date}-${slot.id}-${name}`}>{name}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="mt-2 text-xs text-muted-foreground">Sin asignaciones</p>
                                )}
                                {vacancies > 0 ? (
                                  <p className="mt-1 text-xs text-amber-600">Vacantes sin cubrir: {vacancies}</p>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : (
          <Card className="border-dashed border-2 border-indigo-200 bg-indigo-50/40 shadow-none print:hidden">
            <CardHeader>
              <CardTitle>Genera tu rol semanal</CardTitle>
              <CardDescription>
                Ajusta los criterios y pulsa "Generar rol" para mostrar el resumen listo para impresión.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>Verifica que los puestos configurados coincidan con el personal activo y que no haya colaboradores pendientes por asignar.</p>
              <p>El resumen se habilitará automáticamente una vez completados los requisitos.</p>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={isGeneralModalOpen} onOpenChange={setIsGeneralModalOpen}>
        <DialogContent className="sm:max-w-[95vw] lg:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Datos generales del rol</DialogTitle>
            <DialogDescription>
              Define semana, horarios y notas internas para el turno seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
            <div className="space-y-4">
              <Alert className="border-indigo-100 bg-indigo-50 text-slate-700">
                <AlertTitle>Semana siguiente</AlertTitle>
                <AlertDescription>
                  El rol se planifica para la semana que inicia el {formatISODateLong(weekStartDate)}. Ajusta la fecha si
                  necesitas anticipar escenarios futuros.
                </AlertDescription>
              </Alert>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="week-start">Inicio de la semana</Label>
                  <Input
                    id="week-start"
                    type="date"
                    value={weekStartDate}
                    onChange={(event) => {
                      setWeekStartDate(event.target.value)
                      setScheduleOverrides({})
                      setIsRoleGenerated(false)
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shift-name">Nombre del turno</Label>
                  <Input
                    id="shift-name"
                    value={shiftName}
                    onChange={(event) => {
                      setShiftName(event.target.value)
                      setSelectedPresetId(null)
                    }}
                    placeholder="Turno matutino"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Hora inicio</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(event) => {
                        setStartTime(event.target.value)
                        setSelectedPresetId(null)
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">Hora fin</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(event) => {
                        setEndTime(event.target.value)
                        setSelectedPresetId(null)
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-semibold uppercase text-slate-700">Resumen de semana</p>
                <p>Semana: {weekNumber ? `#${weekNumber}` : "Sin definir"}</p>
                <p>Rango: {weekRangeLabel || "Sin definir"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-slate-800">Configuraciones guardadas</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="sm:w-auto"
                    onClick={() => {
                      setPresetName(shiftName?.trim() ? `${shiftName.trim()} • ${formatISODateLong(weekStartDate)}` : "")
                      setIsSaveScheduleModalOpen(true)
                    }}
                  >
                    Guardar configuración actual
                  </Button>
                </div>
                {isLoadingSchedulePresets ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Cargando configuraciones guardadas...
                  </p>
                ) : schedulePresets.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Aún no hay configuraciones almacenadas. Guarda esta para reutilizar horarios y turnos en futuros roles.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="sm:flex-1">
                      <Label className="text-xs uppercase text-muted-foreground">Selecciona una configuración</Label>
                      <Select
                        value={selectedPresetId ?? ""}
                        onValueChange={(value) => {
                          handleApplySchedulePreset(value)
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Elige una opción guardada" />
                        </SelectTrigger>
                        <SelectContent>
                          {schedulePresets.map((preset) => (
                            <SelectItem key={preset.id} value={preset.id}>
                              {preset.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedPresetId ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="justify-start gap-2 text-red-600 hover:text-red-600"
                        onClick={() => void handleDeleteSchedulePreset(selectedPresetId)}
                        disabled={deletingSchedulePresetId === selectedPresetId}
                      >
                        {deletingSchedulePresetId === selectedPresetId ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Eliminando...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {(["CAS", "Consulado"] as const).map((area) => {
                  const areaLabel = area === "CAS" ? "Horarios CAS" : "Horarios Consulado"
                  const baseClasses =
                    area === "CAS"
                      ? "bg-blue-50/80 border-blue-200"
                      : "bg-emerald-50/80 border-emerald-200"
                  const headerClasses = area === "CAS" ? "text-blue-700" : "text-emerald-700"
                  const badgeClasses = area === "CAS" ? "text-blue-500" : "text-emerald-500"

                  return (
                    <div key={area} className={`space-y-3 rounded-lg border ${baseClasses} p-4`}>
                      <p className={`text-sm font-semibold uppercase ${headerClasses}`}>{areaLabel}</p>
                      {(["supervisors", "employees"] as const).map((role) => {
                        const roleLabel = role === "supervisors" ? "Supervisores" : "Colaboradores"
                        const roleTone = role === "supervisors" ? "bg-white/80" : "bg-white/40"
                        return (
                          <div key={`${area}-${role}`} className={`space-y-2 rounded-md border border-white/60 ${roleTone} p-3 shadow-sm`}>
                            <div className="flex items-center justify-between gap-2">
                              <Label className={`text-xs font-semibold uppercase tracking-wide ${badgeClasses}`}>
                                {roleLabel}
                              </Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-2"
                                onClick={() => addScheduleEntry(area, role)}
                              >
                                <PlusCircle className="h-4 w-4" /> Agregar horario
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {scheduleMatrix[area][role].map((value, index) => (
                                <div key={`${area}-${role}-${index}`} className="flex items-center gap-2">
                                  <Input
                                    value={value}
                                    onChange={(event) => updateScheduleEntry(area, role, index, event.target.value)}
                                    placeholder="07:00 - 15:00"
                                  />
                                  {scheduleMatrix[area][role].length > 1 ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeScheduleEntry(area, role, index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-2">
              <Label htmlFor="notes">Notas internas</Label>
              <Textarea
                id="notes"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Observaciones, guardias especiales, recordatorios de cierre, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGeneralModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSaveScheduleModalOpen}
        onOpenChange={(open) => {
          setIsSaveScheduleModalOpen(open)
          if (!open) {
            setPresetName("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar configuración de horarios</DialogTitle>
            <DialogDescription>
              Almacena esta combinación de horarios y turnos para reutilizarla en futuros roles sin volver a capturarla.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Nombre de la configuración</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="Ej. Rol matutino CAS/Consulado"
              />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold">Se guardarán los siguientes datos:</p>
              <p>• Nombre del turno y horario base ({startTime} - {endTime}).</p>
              <p>• Listado de horarios para supervisores y colaboradores de CAS y Consulado.</p>
              <p className="text-xs text-muted-foreground mt-2">
                Las configuraciones guardadas quedan ligadas a esta oficina y no se sincronizan entre oficinas distintas.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsSaveScheduleModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmSaveSchedulePreset()}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={isSavingSchedulePreset}
            >
              {isSavingSchedulePreset ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                "Guardar configuración"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOperationalModalOpen} onOpenChange={setIsOperationalModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Configuración operativa</DialogTitle>
            <DialogDescription>
              Comprueba que los cupos coincidan con el personal activo y gestiona atributos especiales.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview" className="text-xs uppercase">
                Estado general
              </TabsTrigger>
              <TabsTrigger value="assignments" className="text-xs uppercase">
                Asignaciones especiales
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-5 pt-1">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button size="lg" className="justify-start gap-2" onClick={() => setIsPositionModalOpen(true)}>
                  <Settings2 className="h-4 w-4" /> Configurar puestos y cupos
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => setIsAttributeModalOpen(true)}
                >
                  <Tag className="h-4 w-4" /> Asignar atributos WS / Entrenamiento
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="text-xs uppercase text-muted-foreground">Empleados activos</p>
                  <p className="text-2xl font-semibold text-slate-900">{activeEmployeeCount}</p>
                  <p className="text-[11px] text-muted-foreground">Personal disponible para la semana en curso.</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="text-xs uppercase text-muted-foreground">Puestos configurados</p>
                  <p className="text-2xl font-semibold text-slate-900">{totalRequiredSlots}</p>
                  <p className="text-[11px] text-muted-foreground">Incluye puestos fijos y rotativos configurados.</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="text-xs uppercase text-muted-foreground">Asignaciones actuales</p>
                  <p className="text-2xl font-semibold text-slate-900">{assignedCount}</p>
                  <p
                    className={`text-xs font-medium ${
                      slotBalance === 0
                        ? "text-emerald-600"
                        : slotBalance > 0
                        ? "text-amber-600"
                        : "text-rose-600"
                    }`}
                  >
                    {slotBalance === 0
                      ? "Cupos equilibrados"
                      : slotBalance > 0
                      ? `${slotBalance} colaborador(es) pendientes por ubicar`
                      : `${Math.abs(slotBalance)} puesto(s) excedentes configurados`}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {pendingEmployees > 0 ? (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                    <AlertTitle>Colaboradores pendientes</AlertTitle>
                    <AlertDescription>
                      {pendingEmployees} colaborador(es) siguen pendientes de asignación en el rol semanal.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {slotBalance < 0 ? (
                  <Alert variant="destructive">
                    <AlertTitle>Exceso de puestos configurados</AlertTitle>
                    <AlertDescription>
                      Reduce {Math.abs(slotBalance)} puesto(s) para coincidir con los {activeEmployeeCount} colaboradores activos.
                    </AlertDescription>
                  </Alert>
                ) : slotBalance > 0 ? (
                  <Alert>
                    <AlertTitle>Personal pendiente por ubicar</AlertTitle>
                    <AlertDescription>
                      Configura {slotBalance} puesto(s) adicional(es) y vuelve a ejecutar la asignación automática para cubrir a todo el equipo.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    <AlertTitle>Cupos equilibrados</AlertTitle>
                    <AlertDescription>
                      Los puestos configurados coinciden con el número de empleados activos.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="assignments" className="space-y-4 pt-1">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Asignaciones de atributos</p>
                    <p className="text-sm text-slate-700">
                      Controla WS, entrenamiento y roles especiales para esta semana.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="sm:w-auto"
                    onClick={() => setIsAttributeModalOpen(true)}
                  >
                    <Tag className="mr-2 h-4 w-4" /> Administrar atributos
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {attributes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay atributos configurados.</p>
                  ) : (
                    attributes.map((attribute) => (
                      <Badge key={attribute.id} variant="secondary" className="px-3 py-1">
                        {attribute.label}: {attribute.employeeIds.length}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOperationalModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUnassignedModalOpen} onOpenChange={setIsUnassignedModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Empleados sin puesto asignado</DialogTitle>
            <DialogDescription>
              Estas personas aún no tienen un puesto asignado para la semana actual. Ejecuta la asignación automática para que el sistema las distribuya.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {unassignedEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todos los colaboradores están asignados.</p>
            ) : (
              unassignedEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{getEmployeeDisplayName(employee)}</p>
                    {employee.employee_code ? (
                      <p className="text-xs text-muted-foreground">Código {employee.employee_code}</p>
                    ) : null}
                  </div>
                  <Badge variant="outline">Pendiente</Badge>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUnassignedModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSavedRolesModalOpen} onOpenChange={setIsSavedRolesModalOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Historial de roles generados</DialogTitle>
            <DialogDescription>
              Consulta versiones anteriores tal cual se generaron. Los datos guardados no se actualizan si el personal cambia.
            </DialogDescription>
          </DialogHeader>
          {savedRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no has guardado ningún rol. Genera y guarda uno para comenzar el historial.
            </p>
          ) : (
            <ScrollArea className="max-h-[70vh] pr-2">
              <div className="space-y-6 pr-2">
                {savedRoles.map((role) => (
                  <div
                    key={role.id}
                    className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Semana #{role.weekNumber ?? "-"} • {role.weekRangeLabel || "Sin definir"}
                        </p>
                        <p className="text-xs text-muted-foreground">Turno: {role.shiftName}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Guardado el {new Date(role.createdAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Horario base</p>
                        <p className="text-sm font-semibold text-slate-800">{role.defaultShiftLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Horarios CAS</p>
                        <p className="text-xs text-slate-800">
                          Supervisores: {formatScheduleList(role.scheduleMatrix.CAS.supervisors)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Colaboradores: {formatScheduleList(role.scheduleMatrix.CAS.employees)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Horarios Consulado</p>
                        <p className="text-xs text-slate-800">
                          Supervisores: {formatScheduleList(role.scheduleMatrix.Consulado.supervisors)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Colaboradores: {formatScheduleList(role.scheduleMatrix.Consulado.employees)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Totales</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {role.totalEmployees} empleados / {role.totalPositions} puestos
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                          <tr>
                            <th className="px-3 py-3">Nombre</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3">Puesto rol</th>
                            {role.weekDays.map((day) => (
                              <th key={day.date} className="px-3 py-3">
                                <div className="flex flex-col">
                                  <span>{day.label.toUpperCase()}</span>
                                  <span className="text-[10px] text-muted-foreground">{day.dayNumber}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {role.assignments.map((assignment) => {
                            return (
                              <tr key={`${role.id}-${assignment.employeeId}`} className="align-top">
                                <td className="px-3 py-2">
                                  <div className="font-semibold text-slate-800 uppercase tracking-wide text-xs">
                                    {assignment.displayName}
                                  </div>
                                  {assignment.employeeCode ? (
                                    <div className="text-[10px] uppercase text-muted-foreground">
                                      Código {assignment.employeeCode}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="px-3 py-2 text-xs uppercase text-slate-600">
                                  {assignment.status || "---"}
                                </td>
                                <td className="px-3 py-2 text-xs uppercase text-slate-700">
                                  {`${assignment.position.code} • ${assignment.position.name}`}
                                </td>
                                {assignment.dayEntries.map((dayEntry) => (
                                  <td key={dayEntry.date} className="px-3 py-2 text-xs text-slate-700">
                                    <div className="font-semibold uppercase tracking-wide">
                                      {dayEntry.displayValue}
                                    </div>
                                    {dayEntry.locked ? (
                                      <span className="text-[10px] text-muted-foreground">Calendario automático</span>
                                    ) : null}
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {role.notes.trim() ? (
                      <div className="flex flex-col gap-4 lg:flex-row">
                        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:w-[360px] lg:flex-shrink-0">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-semibold text-slate-800">Configuraciones guardadas de cupos</p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="sm:w-auto"
                              onClick={() => {
                                setPositionPresetName("")
                                setIsSavePositionPresetModalOpen(true)
                              }}
                            >
                              Guardar cupos actuales
                            </Button>
                          </div>
                          {isLoadingPositionPresets ? (
                            <p className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" /> Cargando configuraciones guardadas...
                            </p>
                          ) : positionPresets.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              Aún no guardas distribuciones de puestos. Configura los cupos y almacénalos para reutilizarlos en semanas futuras.
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <div className="sm:flex-1">
                                <Label className="text-xs uppercase text-muted-foreground">Selecciona una configuración</Label>
                                <Select
                                  value={selectedPositionPresetId ?? ""}
                                  onValueChange={(value) => handleApplyPositionPreset(value)}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Elige cupos guardados" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {positionPresets.map((preset) => (
                                      <SelectItem key={preset.id} value={preset.id}>
                                        {preset.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {selectedPositionPresetId ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="justify-start gap-2 text-red-600 hover:text-red-600"
                                  onClick={() => void handleDeletePositionPreset(selectedPositionPresetId)}
                                  disabled={deletingPositionPresetId === selectedPositionPresetId}
                                >
                                  {deletingPositionPresetId === selectedPositionPresetId ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" /> Eliminando...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="h-4 w-4" /> Eliminar
                                    </>
                                  )}
                                </Button>
                              ) : null}
                            </div>
                          )}
                        </div>
                        <ScrollArea className="max-h-[65vh] pr-2 lg:flex-1">
                          <div className="space-y-6 py-2">
                            <section className="space-y-3">
                              <div>
                                <h3 className="text-sm font-semibold uppercase text-slate-700">
                                  Centro de Atención a Solicitantes
                                </h3
              </p>
            ) : positionPresets.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aún no guardas distribuciones de puestos. Configura los cupos y almacénalos para reutilizarlos en semanas futuras.
              </p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="sm:flex-1">
                  <Label className="text-xs uppercase text-muted-foreground">Selecciona una configuración</Label>
                  <Select
                    value={selectedPositionPresetId ?? ""}
                    onValueChange={(value) => handleApplyPositionPreset(value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Elige cupos guardados" />
                    </SelectTrigger>
                    <SelectContent>
                      {positionPresets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedPositionPresetId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-start gap-2 text-red-600 hover:text-red-600"
                    onClick={() => void handleDeletePositionPreset(selectedPositionPresetId)}
                    disabled={deletingPositionPresetId === selectedPositionPresetId}
                  >
                    {deletingPositionPresetId === selectedPositionPresetId ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" /> Eliminar
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
          <ScrollArea className="max-h-[65vh] pr-2">
            <div className="space-y-6 py-2">
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase text-slate-700">
                    Centro de Atención a Solicitantes
                  </h3>

          <Dialog
            open={isSavePositionPresetModalOpen}
            onOpenChange={(open) => {
              setIsSavePositionPresetModalOpen(open)
              if (!open) {
                setPositionPresetName("")
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Guardar configuración de cupos</DialogTitle>
                <DialogDescription>
                  Almacena la cantidad de colaboradores por puesto para reutilizarla en próximas semanas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="position-preset-name">Nombre de la configuración</Label>
                  <Input
                    id="position-preset-name"
                    value={positionPresetName}
                    onChange={(event) => setPositionPresetName(event.target.value)}
                    placeholder="Ej. Operación completa CAS"
                  />
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold">Se guardarán los siguientes datos:</p>
                  <p>• Número de puestos por cada posición del CAS y Consulado.</p>
                  <p>• Se respetarán los puestos mínimos necesarios para los colaboradores marcados como fijos.</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Las configuraciones quedan almacenadas en la base de datos de esta oficina y estarán disponibles la próxima vez que ingreses.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsSavePositionPresetModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleConfirmSavePositionPreset()}
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={isSavingPositionPreset}
                >
                  {isSavingPositionPreset ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                    </>
                  ) : (
                    "Guardar cupos"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
                  <p className="text-xs text-muted-foreground">
                    Configura los puestos operativos base para la semana seleccionada.
                  </p>
                </div>
                <div className="space-y-5">
                  <div className="space-y-3">
                    {UNIT_POSITIONS.filter((position) => position.category === "CAS").map(
                      (position: PositionDefinition) => {
                        const assignedCount = assignments[position.id]?.length || 0
                        const requiredCount = positionSlots[position.id] || 0
                        return (
                          <div key={position.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs uppercase">
                                  {position.code}
                                </Badge>
                                <span className="text-sm font-semibold text-slate-800">{position.name}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{position.description}</p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span>Puestos</span>
                                <Input
                                  type="number"
                                  min="0"
                                  value={positionSlots[position.id] ?? 0}
                                  onChange={(event) => handleSlotChange(position.id, event.target.value)}
                                  className="h-8 w-20 text-center"
                                />
                                <span className="text-[11px] uppercase tracking-wide">
                                  {assignedCount} / {requiredCount} asignados
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                La asignación se realiza automáticamente al generar el rol.
                              </p>
                            </div>
                            <div className="mt-3 space-y-2">
                              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                Asignar colaborador específico
                              </Label>
                              <Select
                                key={`fix-select-${position.id}-${(assignments[position.id] || []).join("-")}`}
                                onValueChange={(employeeId) => handleAssignEmployeeToPosition(position.id, employeeId)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar colaborador" />
                                </SelectTrigger>
                                <SelectContent>
                                  {sortedActiveEmployees
                                    .filter((employee) => isEmployeeEligibleForPosition(employee, position.id))
                                    .map((employee) => {
                                    const currentAssignment = employeeAssignments[employee.id]
                                    const labelParts = [getEmployeeDisplayName(employee)]
                                    if (employee.employee_code) {
                                      labelParts.push(`Código ${employee.employee_code}`)
                                    }
                                    if (currentAssignment && currentAssignment.id !== position.id) {
                                      labelParts.push(`(${currentAssignment.code})`)
                                    }
                                    return (
                                      <SelectItem key={employee.id} value={employee.id}>
                                        {labelParts.join(" · ")}
                                      </SelectItem>
                                    )
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="mt-3 space-y-2">
                              {(assignments[position.id] || []).length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin colaboradores asignados.</p>
                              ) : (
                                assignments[position.id].map((employeeId) => {
                                  const employee = employeeMap.get(employeeId)
                                  return (
                                    <div
                                      key={employeeId}
                                      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="px-3 py-1">
                                          {getEmployeeDisplayName(employee)}
                                        </Badge>
                                        {employee?.employee_code ? (
                                          <span className="text-[11px] uppercase text-muted-foreground">
                                            {employee.employee_code}
                                          </span>
                                        ) : null}
                                      </div>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="text-red-500 hover:text-red-600"
                                        onClick={() => handleRemoveAssignment(position.id, employeeId)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          </div>
                        )
                      }
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-muted-foreground">Supervisores</p>
                    <div className="space-y-3">
                      {SUPERVISOR_POSITIONS.filter((position) => position.category === "CAS").map(
                        (position: PositionDefinition) => {
                          const assignedCount = assignments[position.id]?.length || 0
                          const requiredCount = positionSlots[position.id] || 0
                          return (
                            <div key={position.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs uppercase">
                                    {position.code}
                                  </Badge>
                                  <span className="text-sm font-semibold text-slate-800">{position.name}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{position.description}</p>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span>Puestos</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={positionSlots[position.id] ?? 0}
                                    onChange={(event) => handleSlotChange(position.id, event.target.value)}
                                    className="h-8 w-20 text-center"
                                  />
                                  <span className="text-[11px] uppercase tracking-wide">
                                    {assignedCount} / {requiredCount} asignados
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  La asignación se realiza automáticamente al generar el rol.
                                </p>
                              </div>
                              <div className="mt-3 space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                  Asignar colaborador específico
                                </Label>
                                <Select
                                  key={`fix-select-${position.id}-${(assignments[position.id] || []).join("-")}`}
                                  onValueChange={(employeeId) => handleAssignEmployeeToPosition(position.id, employeeId)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sortedActiveEmployees
                                      .filter((employee) => isEmployeeEligibleForPosition(employee, position.id))
                                      .map((employee) => {
                                      const currentAssignment = employeeAssignments[employee.id]
                                      const labelParts = [getEmployeeDisplayName(employee)]
                                      if (employee.employee_code) {
                                        labelParts.push(`Código ${employee.employee_code}`)
                                      }
                                      if (currentAssignment && currentAssignment.id !== position.id) {
                                        labelParts.push(`(${currentAssignment.code})`)
                                      }
                                      return (
                                        <SelectItem key={employee.id} value={employee.id}>
                                          {labelParts.join(" · ")}
                                        </SelectItem>
                                      )
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="mt-3 space-y-2">
                                {(assignments[position.id] || []).length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Sin colaboradores asignados.</p>
                                ) : (
                                  assignments[position.id].map((employeeId) => {
                                    const employee = employeeMap.get(employeeId)
                                    return (
                                      <div
                                        key={employeeId}
                                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Badge variant="secondary" className="px-3 py-1">
                                            {getEmployeeDisplayName(employee)}
                                          </Badge>
                                          {employee?.employee_code ? (
                                            <span className="text-[11px] uppercase text-muted-foreground">
                                              {employee.employee_code}
                                            </span>
                                          ) : null}
                                        </div>
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          className="text-red-500 hover:text-red-600"
                                          onClick={() => handleRemoveAssignment(position.id, employeeId)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )
                                  })
                                )}
                              </div>
                            </div>
                          )
                        }
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase text-slate-700">Consulado</h3>
                  <p className="text-xs text-muted-foreground">
                    Define los puestos administrativos para el personal del consulado.
                  </p>
                </div>
                <div className="space-y-5">
                  <div className="space-y-3">
                    {UNIT_POSITIONS.filter((position) => position.category === "Consulado").map(
                      (position: PositionDefinition) => {
                        const assignedCount = assignments[position.id]?.length || 0
                        const requiredCount = positionSlots[position.id] || 0
                        return (
                          <div key={position.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs uppercase">
                                  {position.code}
                                </Badge>
                                <span className="text-sm font-semibold text-slate-800">{position.name}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{position.description}</p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span>Puestos</span>
                                <Input
                                  type="number"
                                  min="0"
                                  value={positionSlots[position.id] ?? 0}
                                  onChange={(event) => handleSlotChange(position.id, event.target.value)}
                                  className="h-8 w-20 text-center"
                                />
                                <span className="text-[11px] uppercase tracking-wide">
                                  {assignedCount} / {requiredCount} asignados
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                La asignación se realiza automáticamente al generar el rol.
                              </p>
                            </div>
                            <div className="mt-3 space-y-2">
                              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                Asignar colaborador específico
                              </Label>
                              <Select
                                key={`fix-select-${position.id}-${(assignments[position.id] || []).join("-")}`}
                                onValueChange={(employeeId) => handleAssignEmployeeToPosition(position.id, employeeId)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar colaborador" />
                                </SelectTrigger>
                                <SelectContent>
                                  {sortedActiveEmployees
                                    .filter((employee) => isEmployeeEligibleForPosition(employee, position.id))
                                    .map((employee) => {
                                      const currentAssignment = employeeAssignments[employee.id]
                                      const labelParts = [getEmployeeDisplayName(employee)]
                                      if (employee.employee_code) {
                                        labelParts.push(`Código ${employee.employee_code}`)
                                      }
                                      if (currentAssignment && currentAssignment.id !== position.id) {
                                        labelParts.push(`(${currentAssignment.code})`)
                                      }
                                      return (
                                        <SelectItem key={employee.id} value={employee.id}>
                                          {labelParts.join(" · ")}
                                        </SelectItem>
                                      )
                                    })}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="mt-3 space-y-2">
                              {(assignments[position.id] || []).length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin colaboradores asignados.</p>
                              ) : (
                                assignments[position.id].map((employeeId) => {
                                  const employee = employeeMap.get(employeeId)
                                  return (
                                    <div
                                      key={employeeId}
                                      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="px-3 py-1">
                                          {getEmployeeDisplayName(employee)}
                                        </Badge>
                                        {employee?.employee_code ? (
                                          <span className="text-[11px] uppercase text-muted-foreground">
                                            {employee.employee_code}
                                          </span>
                                        ) : null}
                                      </div>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="text-red-500 hover:text-red-600"
                                        onClick={() => handleRemoveAssignment(position.id, employeeId)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          </div>
                        )
                      }
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-muted-foreground">Supervisores</p>
                    <div className="space-y-3">
                      {SUPERVISOR_POSITIONS.filter((position) => position.category === "Consulado").map(
                        (position: PositionDefinition) => {
                          const assignedCount = assignments[position.id]?.length || 0
                          const requiredCount = positionSlots[position.id] || 0
                          return (
                            <div key={position.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs uppercase">
                                    {position.code}
                                  </Badge>
                                  <span className="text-sm font-semibold text-slate-800">{position.name}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{position.description}</p>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span>Puestos</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={positionSlots[position.id] ?? 0}
                                    onChange={(event) => handleSlotChange(position.id, event.target.value)}
                                    className="h-8 w-20 text-center"
                                  />
                                  <span className="text-[11px] uppercase tracking-wide">
                                    {assignedCount} / {requiredCount} asignados
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  La asignación se realiza automáticamente al generar el rol.
                                </p>
                              </div>
                              <div className="mt-3 space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                  Asignar colaborador específico
                                </Label>
                                <Select
                                  key={`fix-select-${position.id}-${(assignments[position.id] || []).join("-")}`}
                                  onValueChange={(employeeId) => handleAssignEmployeeToPosition(position.id, employeeId)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar colaborador" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sortedActiveEmployees
                                      .filter((employee) => isEmployeeEligibleForPosition(employee, position.id))
                                      .map((employee) => {
                                      const currentAssignment = employeeAssignments[employee.id]
                                      const labelParts = [getEmployeeDisplayName(employee)]
                                      if (employee.employee_code) {
                                        labelParts.push(`Código ${employee.employee_code}`)
                                      }
                                      if (currentAssignment && currentAssignment.id !== position.id) {
                                        labelParts.push(`(${currentAssignment.code})`)
                                      }
                                      return (
                                        <SelectItem key={employee.id} value={employee.id}>
                                          {labelParts.join(" · ")}
                                        </SelectItem>
                                      )
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="mt-3 space-y-2">
                                {(assignments[position.id] || []).length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Sin colaboradores asignados.</p>
                                ) : (
                                  assignments[position.id].map((employeeId) => {
                                    const employee = employeeMap.get(employeeId)
                                    return (
                                      <div
                                        key={employeeId}
                                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Badge variant="secondary" className="px-3 py-1">
                                            {getEmployeeDisplayName(employee)}
                                          </Badge>
                                          {employee?.employee_code ? (
                                            <span className="text-[11px] uppercase text-muted-foreground">
                                              {employee.employee_code}
                                            </span>
                                          ) : null}
                                        </div>
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          className="text-red-500 hover:text-red-600"
                                          onClick={() => handleRemoveAssignment(position.id, employeeId)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )
                                  })
                                )}
                              </div>
                            </div>
                          )
                        }
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPositionModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAttributeModalOpen} onOpenChange={setIsAttributeModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Asignar atributos especiales</DialogTitle>
            <DialogDescription>
              Marca qué colaboradores fungirán como WS o estarán en entrenamiento esta semana.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ScrollArea className="max-h-[60vh] rounded-md border">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-3">Empleado</th>
                    {attributes.map((attribute) => (
                      <th key={attribute.id} className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span>{attribute.label.toUpperCase()}</span>
                          {attribute.description ? (
                            <span className="text-[10px] text-muted-foreground">{attribute.description}</span>
                          ) : null}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedActiveEmployees.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={1 + attributes.length}>
                        No hay colaboradores activos para asignar atributos.
                      </td>
                    </tr>
                  ) : (
                    sortedActiveEmployees.map((employee) => (
                      <tr key={employee.id}>
                        <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                          {getEmployeeDisplayName(employee)}
                          {employee.employee_code ? (
                            <div className="text-[10px] text-muted-foreground">Código {employee.employee_code}</div>
                          ) : null}
                        </td>
                        {attributes.map((attribute) => (
                          <td key={attribute.id} className="px-3 py-2 text-center">
                            <Checkbox
                              checked={attribute.employeeIds.includes(employee.id)}
                              onCheckedChange={(checked) =>
                                handleAttributeToggle(attribute.id, employee.id, checked)
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAttributeModalOpen(false)}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
