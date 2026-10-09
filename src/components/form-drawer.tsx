import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

interface FormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  footer?: React.ReactNode
  /** Classi per il contenitore del drawer, es. un'altezza fissa. */
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}

/**
 * Drawer dal basso per i moduli di inserimento (preferito ai Dialog su mobile).
 * Il contenuto scorre, il footer resta visibile sopra la safe area.
 * Il contenuto viene montato a ogni apertura, quindi lo stato interno riparte pulito.
 */
export function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  footer,
  className,
  bodyClassName,
  children,
}: FormDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className={className}>
        <DrawerHeader className="text-left md:text-left">
          <DrawerTitle className="text-lg">{title}</DrawerTitle>
          {description && <DrawerDescription className="text-left">{description}</DrawerDescription>}
        </DrawerHeader>
        <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4', bodyClassName)}>
          {children}
        </div>
        {footer && (
          <DrawerFooter className="border-t pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {footer}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  )
}
