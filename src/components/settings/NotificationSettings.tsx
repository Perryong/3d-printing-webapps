
import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface NotificationSettingsType {
  printCompleted: boolean;
  priceAlerts: boolean;
  newProviders: boolean;
  promotions: boolean;
}

interface NotificationSettingsProps {
  notifications: NotificationSettingsType;
  onNotificationsChange: (settings: NotificationSettingsType) => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  notifications,
  onNotificationsChange
}) => {
  const updateNotificationSetting = (key: keyof NotificationSettingsType, value: any) => {
    onNotificationsChange({ ...notifications, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-gray-300">Print completed</Label>
        <Switch
          checked={notifications.printCompleted}
          onCheckedChange={(checked) => updateNotificationSetting('printCompleted', checked)}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <Label className="text-gray-300">Price alerts</Label>
        <Switch
          checked={notifications.priceAlerts}
          onCheckedChange={(checked) => updateNotificationSetting('priceAlerts', checked)}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <Label className="text-gray-300">New providers</Label>
        <Switch
          checked={notifications.newProviders}
          onCheckedChange={(checked) => updateNotificationSetting('newProviders', checked)}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <Label className="text-gray-300">Promotions</Label>
        <Switch
          checked={notifications.promotions}
          onCheckedChange={(checked) => updateNotificationSetting('promotions', checked)}
        />
      </div>
    </div>
  );
};
