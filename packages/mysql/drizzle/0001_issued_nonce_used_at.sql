ALTER TABLE `nonces` ADD `usedAt` datetime;--> statement-breakpoint
UPDATE `nonces` SET `usedAt` = NOW() WHERE `usedAt` IS NULL;
