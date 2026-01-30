"use client";

import { motion } from "framer-motion";
import { Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";

export interface BookingService {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  locationId?: string | null;
  location?: { id: string; name: string } | null;
  imageUrl?: string;
  category?: string;
  maxCapacity?: number;
}

interface BookingServiceStepProps {
  services: BookingService[];
  currency?: string;
  onServiceSelected: (service: BookingService) => void;
}

export function BookingServiceStep({
  services,
  currency,
  onServiceSelected,
}: BookingServiceStepProps) {
  return (
    <motion.div
      key="service"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <h2 className="text-2xl font-semibold mb-6">Select a Service</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <motion.button
            key={service.id}
            onClick={() => onServiceSelected(service)}
            className="text-left p-6 border-2 rounded-lg transition-all hover:border-primary hover:shadow-lg hover:scale-[1.02] bg-card"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {service.imageUrl && (
              <div className="mb-3 rounded-lg overflow-hidden">
                <img
                  src={service.imageUrl}
                  alt={service.name}
                  className="w-full h-32 object-cover"
                />
              </div>
            )}
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{service.name}</h3>
                {service.category && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {service.category}
                  </Badge>
                )}
              </div>
              <Badge variant="secondary" className="ml-2">
                {formatCurrency(service.price, currency)}
              </Badge>
            </div>
            {service.description && (
              <p className="text-sm text-muted-foreground mb-3">
                {service.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{service.duration} min</span>
              </div>
              {service.maxCapacity && service.maxCapacity > 1 && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>Up to {service.maxCapacity} people</span>
                </div>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
