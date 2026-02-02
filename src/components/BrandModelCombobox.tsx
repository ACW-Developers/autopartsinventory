import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { COMMON_BRANDS, BRAND_MODELS } from '@/data/brandModels';

interface BrandModelComboboxProps {
  brand: string;
  model: string;
  onBrandChange: (brand: string) => void;
  onModelChange: (model: string) => void;
}

export function BrandModelCombobox({ brand, model, onBrandChange, onModelChange }: BrandModelComboboxProps) {
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [customBrand, setCustomBrand] = useState('');
  const [customModel, setCustomModel] = useState('');

  const isKnownBrand = COMMON_BRANDS.includes(brand);
  const availableModels = isKnownBrand && brand ? BRAND_MODELS[brand] || [] : [];

  useEffect(() => {
    // If brand changes and is a known brand, reset model if it's not in the new brand's models
    if (isKnownBrand && model && availableModels.length > 0 && !availableModels.includes(model)) {
      onModelChange('');
    }
  }, [brand]);

  const handleBrandSelect = (selectedBrand: string) => {
    onBrandChange(selectedBrand);
    setCustomBrand('');
    setBrandOpen(false);
  };

  const handleCustomBrandSubmit = () => {
    if (customBrand.trim()) {
      onBrandChange(customBrand.trim());
      setCustomBrand('');
      setBrandOpen(false);
    }
  };

  const handleModelSelect = (selectedModel: string) => {
    onModelChange(selectedModel);
    setCustomModel('');
    setModelOpen(false);
  };

  const handleCustomModelSubmit = () => {
    if (customModel.trim()) {
      onModelChange(customModel.trim());
      setCustomModel('');
      setModelOpen(false);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Brand Combobox */}
      <div className="space-y-2">
        <Label>Brand</Label>
        <Popover open={brandOpen} onOpenChange={setBrandOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={brandOpen}
              className="w-full justify-between"
            >
              {brand || "Select brand..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0 z-50 bg-popover" align="start">
            <Command>
              <CommandInput placeholder="Search or type brand..." />
              <CommandList>
                <CommandEmpty>
                  <div className="p-2 space-y-2">
                    <p className="text-sm text-muted-foreground">Brand not found. Add custom:</p>
                    <div className="flex gap-2">
                      <Input
                        value={customBrand}
                        onChange={(e) => setCustomBrand(e.target.value)}
                        placeholder="Enter brand name"
                        className="h-8"
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomBrandSubmit()}
                      />
                      <Button size="sm" onClick={handleCustomBrandSubmit}>Add</Button>
                    </div>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {COMMON_BRANDS.map((b) => (
                    <CommandItem
                      key={b}
                      value={b}
                      onSelect={() => handleBrandSelect(b)}
                    >
                      <Check className={cn("mr-2 h-4 w-4", brand === b ? "opacity-100" : "opacity-0")} />
                      {b}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            <div className="p-2 border-t">
              <div className="flex gap-2">
                <Input
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  placeholder="Or type custom brand..."
                  className="h-8"
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomBrandSubmit()}
                />
                <Button size="sm" onClick={handleCustomBrandSubmit} disabled={!customBrand.trim()}>
                  Add
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Model Combobox/Input */}
      <div className="space-y-2">
        <Label>Model / Type</Label>
        {isKnownBrand && availableModels.length > 0 ? (
          <Popover open={modelOpen} onOpenChange={setModelOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={modelOpen}
                className="w-full justify-between"
              >
                {model || "Select model..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0 z-50 bg-popover" align="start">
              <Command>
                <CommandInput placeholder="Search or type model..." />
                <CommandList>
                  <CommandEmpty>
                    <div className="p-2 space-y-2">
                      <p className="text-sm text-muted-foreground">Model not found. Add custom:</p>
                      <div className="flex gap-2">
                        <Input
                          value={customModel}
                          onChange={(e) => setCustomModel(e.target.value)}
                          placeholder="Enter model name"
                          className="h-8"
                          onKeyDown={(e) => e.key === 'Enter' && handleCustomModelSubmit()}
                        />
                        <Button size="sm" onClick={handleCustomModelSubmit}>Add</Button>
                      </div>
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {availableModels.map((m) => (
                      <CommandItem
                        key={m}
                        value={m}
                        onSelect={() => handleModelSelect(m)}
                      >
                        <Check className={cn("mr-2 h-4 w-4", model === m ? "opacity-100" : "opacity-0")} />
                        {m}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
              <div className="p-2 border-t">
                <div className="flex gap-2">
                  <Input
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="Or type custom model..."
                    className="h-8"
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomModelSubmit()}
                  />
                  <Button size="sm" onClick={handleCustomModelSubmit} disabled={!customModel.trim()}>
                    Add
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <Input
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            placeholder={brand ? `Enter ${brand} model...` : "Select a brand first"}
            disabled={!brand}
          />
        )}
      </div>
    </div>
  );
}
