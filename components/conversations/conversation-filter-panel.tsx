import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface ConversationFilterPanelProps {
  selectedOutcomes: string[]
  onOutcomesChange: (outcomes: string[]) => void
  scoreRange: number[]
  onScoreRangeChange: (range: number[]) => void
  turnsRange: number[]
  onTurnsRangeChange: (range: number[]) => void
  categories: string[]
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  personas: any[]
  selectedPersonas: string[]
  onPersonasChange: (personas: string[]) => void
  testRuns: string[]
  selectedTestRuns: string[]
  onTestRunsChange: (testRuns: string[]) => void
}

function CheckboxFilter({ id, label, checked, disabled, onChange, className }: {
  id: string; label: string; checked: boolean; disabled?: boolean
  onChange: (checked: boolean) => void; className?: string
}) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={(c) => onChange(!!c)} />
      <Label htmlFor={id} className={`text-sm cursor-pointer ${className || ""}`}>{label}</Label>
    </div>
  )
}

function toggleItem(list: string[], item: string, checked: boolean): string[] {
  return checked ? [...list, item] : list.filter((i) => i !== item)
}

export function ConversationFilterPanel(props: ConversationFilterPanelProps) {
  return (
    <div className="border-b-2 border-primary/30 overflow-y-auto" style={{ maxHeight: "250px" }}>
      <Accordion type="multiple" defaultValue={["general"]} className="px-4">
        <AccordionItem value="general" className="border-b-2 border-primary/20">
          <AccordionTrigger className="py-3 text-sm font-bold uppercase tracking-wider hover:no-underline hover:text-accent">
            General Filters
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Outcome</Label>
              <div className="space-y-2">
                {["success", "partial", "failure"].map((o) => (
                  <CheckboxFilter key={o} id={o} label={o} checked={props.selectedOutcomes.includes(o)}
                    onChange={(c) => props.onOutcomesChange(toggleItem(props.selectedOutcomes, o, c))} className="capitalize" />
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                Score: {props.scoreRange[0]} - {props.scoreRange[1]}
              </Label>
              <Slider min={0} max={10} step={0.5} value={props.scoreRange} onValueChange={props.onScoreRangeChange} className="w-full" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                Turns: {props.turnsRange[0]} - {props.turnsRange[1]}
              </Label>
              <Slider min={0} max={20} step={1} value={props.turnsRange} onValueChange={props.onTurnsRangeChange} className="w-full" />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="categories" className="border-b-2 border-primary/20">
          <AccordionTrigger className="py-3 text-sm font-bold uppercase tracking-wider hover:no-underline hover:text-accent">
            Categories
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-2">
              {props.categories.length > 0 ? props.categories.map((cat) => (
                <CheckboxFilter key={cat} id={`category-${cat}`} label={cat}
                  checked={props.selectedCategories.includes(cat)}
                  onChange={(c) => {
                    props.onCategoriesChange(toggleItem(props.selectedCategories, cat, c))
                    if (c) props.onPersonasChange([])
                  }} />
              )) : <p className="text-xs text-muted-foreground">No categories available</p>}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="personas" className="border-b-2 border-primary/20">
          <AccordionTrigger className="py-3 text-sm font-bold uppercase tracking-wider hover:no-underline hover:text-accent">
            Personas {props.selectedCategories.length > 0 && "(filtered)"}
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              {props.personas.length > 0 ? props.personas.map((p) => (
                <CheckboxFilter key={p.id} id={p.id} label={p.name}
                  checked={props.selectedPersonas.includes(p.id)}
                  disabled={props.selectedCategories.length > 0}
                  onChange={(c) => props.onPersonasChange(toggleItem(props.selectedPersonas, p.id, c))}
                  className={props.selectedCategories.length > 0 ? "text-muted-foreground" : ""} />
              )) : <p className="text-xs text-muted-foreground">No personas available</p>}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="testruns" className="border-b-0">
          <AccordionTrigger className="py-3 text-sm font-bold uppercase tracking-wider hover:no-underline hover:text-accent">
            Test Runs
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              {props.testRuns.length > 0 ? props.testRuns.map((tr) => (
                <CheckboxFilter key={tr} id={`testrun-${tr}`} label={tr}
                  checked={props.selectedTestRuns.includes(tr)}
                  onChange={(c) => props.onTestRunsChange(toggleItem(props.selectedTestRuns, tr, c))}
                  className="font-mono" />
              )) : <p className="text-xs text-muted-foreground">No test runs available</p>}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
