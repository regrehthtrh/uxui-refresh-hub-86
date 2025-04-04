
import React, { useState } from "react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check } from "lucide-react";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface AgencyFilterProps {
  agencies: string[];
  value: string;
  onValueChange: (value: string) => void;
}

const AgencyFilter = ({ agencies, value, onValueChange }: AgencyFilterProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-48 justify-between"
        >
          {value === "all" 
            ? "Agence: Toutes" 
            : `Agence: ${value}`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher une agence..." />
          <CommandEmpty>Aucune agence trouvée.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            <CommandItem
              key="all-agencies"
              value="all"
              onSelect={() => {
                onValueChange("all");
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  value === "all" ? "opacity-100" : "opacity-0"
                )}
              />
              Toutes les agences
            </CommandItem>
            
            {agencies.map((agency) => (
              <CommandItem
                key={agency}
                value={agency}
                onSelect={() => {
                  onValueChange(agency);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === agency ? "opacity-100" : "opacity-0"
                  )}
                />
                {agency}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default AgencyFilter;
