import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

interface FormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  /** Classi per il contenitore del drawer, es. un'altezza fissa. */
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}

/**
 * Drawer dal basso per i moduli di inserimento (preferito ai Dialog su mobile).
 * Il contenuto scorre; i pulsanti stanno in fondo al modulo, sopra la safe area.
 * Il contenuto viene montato a ogni apertura, quindi lo stato interno riparte pulito.
 */
export function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  className,
  bodyClassName,
  children,
}: FormDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className={className}>
        <DrawerHeader>
          <DrawerTitle className="text-lg">{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4', bodyClassName)}>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
