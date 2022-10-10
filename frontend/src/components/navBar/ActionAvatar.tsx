import { ActionIcon, Avatar, Menu } from "@mantine/core";
import { NextLink } from "@mantine/next";
import { DoorExit, Link, Moon } from "tabler-icons-react";
import authService from "../../services/auth.service";
import ToggleThemeButton from "./ToggleThemeButton";

const ActionAvatar = () => {
  return (
    <Menu>
      <Menu.Target>
        <ActionIcon>
          <Avatar size={28} radius="xl" />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>My account</Menu.Label>
        <Menu.Item
          component={NextLink}
          href="/account/shares"
          icon={<Link size={14} />}
        >
          Shares
        </Menu.Item>
        <Menu.Item
          onClick={async () => {
            authService.signOut();
          }}
          icon={<DoorExit size={14} />}
        >
          Sign out
        </Menu.Item>
        <Menu.Label>Settings</Menu.Label>
        <Menu.Item icon={<Moon size={14} />}>
          <ToggleThemeButton />
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default ActionAvatar;
