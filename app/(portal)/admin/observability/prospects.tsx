"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Briefcase,
  Plus,
  Play,
  Square,
  Trash2,
  Eye,
  Upload,
  Link,
  Loader2,
  Store,
  AlertTriangle,
  ArrowUpCircle,
  Undo2,
} from "lucide-react";

// --- Types ---

interface ProspectEntry {
  id: string;
  restaurant_name: string;
  category: string;
  city: string;
  image_file: string;
  extraction_file: string;
  product_count: number;
  demo_bot_id: number | null;
  status: "extracted" | "demo_active" | "archived" | "promoted";
  added_date: string;
}

interface ExtractedProduct {
  name: string;
  price: number;
  category: string;
  description?: string;
  keywords?: string[] | string;
}

// --- Helpers ---

const CATEGORIES = [
  "pizzaria",
  "hamburgueria",
  "sushi",
  "pastelaria",
  "açaiteria",
  "lanchonete",
  "padaria",
  "marmitaria",
  "cafeteria",
  "doceria",
  "espetaria",
  "outros",
];

function statusBadge(status: string) {
  switch (status) {
    case "extracted":
      return (
        <Badge variant="outline" className="border-amber-500/50 text-amber-600">
          Extracted
        </Badge>
      );
    case "demo_active":
      return (
        <Badge variant="outline" className="border-emerald-500/50 text-emerald-600">
          Demo Active
        </Badge>
      );
    case "promoted":
      return (
        <Badge variant="outline" className="border-teal-500/50 text-teal-600">
          In Corpus
        </Badge>
      );
    case "archived":
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Archived
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatPrice(price: number): string {
  return `R$ ${price.toFixed(2).replace(".", ",")}`;
}

// --- Components ---

function AddProspectForm({ onSuccess }: { onSuccess: (products: ExtractedProduct[]) => void }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [useFile, setUseFile] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const addMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const fileCount = formData.getAll("files").length;
      const timeoutMs = Math.max(30000, fileCount * 20000 + 10000);
      return (await api.post("/monitoring/admin/prospect/add", formData, { timeout: timeoutMs })).data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-prospects"] });
      onSuccess(data.products ?? []);
      setName("");
      setCategory("");
      setCity("");
      setImageUrl("");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 10);
    setSelectedFiles(files);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("restaurant_name", name);
    fd.append("category", category);
    fd.append("city", city);

    if (useFile && selectedFiles.length > 0) {
      for (const f of selectedFiles) {
        fd.append("files", f);
      }
    } else {
      fd.append("image_url", imageUrl);
    }

    addMutation.mutate(fd);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Plus className="h-4 w-4 text-muted-foreground" />
          Add Prospect
        </CardTitle>
        <CardDescription>
          Upload a restaurant menu image to extract products and prepare a demo bot
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Restaurant Name
              </label>
              <Input
                placeholder="Pizzaria do Mario"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                City
              </label>
              <Input
                placeholder="São Paulo"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          {/* Image source toggle */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                type="button"
                variant={!useFile ? "default" : "outline"}
                size="sm"
                onClick={() => setUseFile(false)}
                className="text-xs"
              >
                <Link className="h-3 w-3 mr-1" /> URL
              </Button>
              <Button
                type="button"
                variant={useFile ? "default" : "outline"}
                size="sm"
                onClick={() => setUseFile(true)}
                className="text-xs"
              >
                <Upload className="h-3 w-3 mr-1" /> Upload
              </Button>
            </div>

            {useFile ? (
              <div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="text-sm"
                />
                {selectedFiles.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedFiles.length} images selected (max 10)
                  </p>
                )}
              </div>
            ) : (
              <Input
                placeholder="https://example.com/menu.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            )}
          </div>

          {addMutation.isError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {(addMutation.error as Error)?.message ||
                  "Failed to add prospect. Check the image and try again."}
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={addMutation.isPending || !name}
            className="w-full sm:w-auto"
          >
            {addMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {selectedFiles.length > 1
                  ? `Extracting from ${selectedFiles.length} images...`
                  : "Extracting products..."}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Prospect
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ProductsDialog({
  open,
  onClose,
  products,
  restaurantName,
}: {
  open: boolean;
  onClose: () => void;
  products: ExtractedProduct[];
  restaurantName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{restaurantName} — {products.length} Products</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {p.category || "Geral"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatPrice(p.price)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

function ProspectRow({
  entry,
  onViewProducts,
}: {
  entry: ProspectEntry;
  onViewProducts: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteCategory, setPromoteCategory] = useState(entry.category);

  const demoMutation = useMutation({
    mutationFn: async () => {
      return (await api.post(`/monitoring/admin/prospect/${entry.id}/demo`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prospects"] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      return (await api.delete(`/monitoring/admin/prospect/${entry.id}/demo`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prospects"] });
    },
  });

  const promoteMutation = useMutation({
    mutationFn: async (category: string) => {
      return (await api.post(`/monitoring/admin/prospect/${entry.id}/promote`, { category })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prospects"] });
      setPromoteOpen(false);
    },
  });

  const unpromoteMutation = useMutation({
    mutationFn: async () => {
      return (await api.delete(`/monitoring/admin/prospect/${entry.id}/promote`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prospects"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      return (await api.delete(`/monitoring/admin/prospect/${entry.id}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prospects"] });
    },
  });

  const isLoading =
    demoMutation.isPending || stopMutation.isPending || removeMutation.isPending ||
    promoteMutation.isPending || unpromoteMutation.isPending;

  const canPromote = entry.status === "extracted" || entry.status === "demo_active";

  return (
    <>
      <TableRow
        className={
          entry.status === "demo_active"
            ? "bg-emerald-500/5"
            : entry.status === "promoted"
              ? "bg-teal-500/5"
              : ""
        }
      >
        <TableCell className="font-medium max-w-[200px] truncate" title={entry.restaurant_name}>
          {entry.restaurant_name}
        </TableCell>
        <TableCell>{entry.city}</TableCell>
        <TableCell className="text-center">
          <Badge variant="outline" className="text-xs">
            {entry.category}
          </Badge>
        </TableCell>
        <TableCell className="text-center font-mono text-sm">{entry.product_count}</TableCell>
        <TableCell className="text-center">{statusBadge(entry.status)}</TableCell>
        <TableCell className="text-center text-xs text-muted-foreground">{entry.added_date}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1 justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onViewProducts(entry.id)}
            >
              <Eye className="h-3 w-3 mr-1" /> Products
            </Button>

            {entry.status === "extracted" && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
                onClick={() => demoMutation.mutate()}
                disabled={isLoading}
              >
                {demoMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" /> Create Demo
                  </>
                )}
              </Button>
            )}

            {entry.status === "demo_active" && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                onClick={() => stopMutation.mutate()}
                disabled={isLoading}
              >
                {stopMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Square className="h-3 w-3 mr-1" /> Stop Demo
                  </>
                )}
              </Button>
            )}

            {/* Promote to corpus */}
            {canPromote && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs border-teal-500/50 text-teal-600 hover:bg-teal-500/10"
                onClick={() => {
                  setPromoteCategory(entry.category);
                  setPromoteOpen(true);
                }}
                disabled={isLoading}
              >
                <ArrowUpCircle className="h-3 w-3 mr-1" /> Promote
              </Button>
            )}

            {/* Unpromote from corpus */}
            {entry.status === "promoted" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-teal-600 hover:text-teal-700"
                onClick={() => unpromoteMutation.mutate()}
                disabled={isLoading}
              >
                {unpromoteMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Undo2 className="h-3 w-3 mr-1" /> Unpromote
                  </>
                )}
              </Button>
            )}

            {entry.status !== "promoted" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={() => {
                  if (confirm(`Remove prospect "${entry.restaurant_name}"? This cannot be undone.`)) {
                    removeMutation.mutate();
                  }
                }}
                disabled={isLoading}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* Promote dialog with category override */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Promote to Corpus</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will add <strong>{entry.restaurant_name}</strong> to the QA corpus as a real
            restaurant menu. It becomes eligible for baseline pool inclusion.
          </p>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Category (fix if needed)
            </label>
            <Select value={promoteCategory} onValueChange={setPromoteCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setPromoteOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => promoteMutation.mutate(promoteCategory)}
              disabled={promoteMutation.isPending}
            >
              {promoteMutation.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <ArrowUpCircle className="h-3 w-3 mr-1" />
              )}
              Promote
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Main Export ---

export function ProspectsPanel() {
  const [productsDialog, setProductsDialog] = useState<{
    open: boolean;
    products: ExtractedProduct[];
    name: string;
  }>({ open: false, products: [], name: "" });

  const { data, isLoading } = useQuery<{ entries: ProspectEntry[] }>({
    queryKey: ["admin-prospects"],
    queryFn: async () => (await api.get("/monitoring/admin/prospect/pool")).data,
    staleTime: 1000 * 60,
  });

  const entries = data?.entries ?? [];
  const activeCount = entries.filter((e) => e.status === "demo_active").length;
  const extractedCount = entries.filter((e) => e.status === "extracted").length;
  const promotedCount = entries.filter((e) => e.status === "promoted").length;

  const handleViewProducts = async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    try {
      const resp = await api.get(`/monitoring/admin/prospect/${id}/products`);
      setProductsDialog({
        open: true,
        products: resp.data.products ?? [],
        name: entry.restaurant_name,
      });
    } catch {
      setProductsDialog({
        open: true,
        products: [],
        name: entry.restaurant_name,
      });
    }
  };

  const handleAddSuccess = (products: ExtractedProduct[]) => {
    if (products.length > 0) {
      setProductsDialog({
        open: true,
        products,
        name: "Extraction Result",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[250px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <AddProspectForm onSuccess={handleAddSuccess} />

      {/* Stats row */}
      {entries.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Total Prospects
              </div>
              <div className="text-2xl font-bold font-heading">{entries.length}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Ready for Demo
              </div>
              <div className="text-2xl font-bold font-heading text-amber-600">
                {extractedCount}
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Active Demos
              </div>
              <div className="text-2xl font-bold font-heading text-emerald-600">
                {activeCount}
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                In Corpus
              </div>
              <div className="text-2xl font-bold font-heading text-teal-600">
                {promotedCount}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Prospect list */}
      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No prospects yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add a restaurant menu image above to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Prospect Pool
              <Badge variant="outline" className="text-[10px] font-normal">
                {entries.length} total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Restaurant</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead className="text-center">Category</TableHead>
                    <TableHead className="text-center">Products</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <ProspectRow
                      key={entry.id}
                      entry={entry}
                      onViewProducts={handleViewProducts}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products dialog */}
      <ProductsDialog
        open={productsDialog.open}
        onClose={() => setProductsDialog({ open: false, products: [], name: "" })}
        products={productsDialog.products}
        restaurantName={productsDialog.name}
      />
    </div>
  );
}
