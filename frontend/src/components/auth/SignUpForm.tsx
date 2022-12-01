import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm, yupResolver } from "@mantine/form";
import Link from "next/link";
import * as yup from "yup";
import useConfig from "../../hooks/config.hook";
import authService from "../../services/auth.service";
import toast from "../../utils/toast.util";

const SignUpForm = () => {
  const config = useConfig();

  const validationSchema = yup.object().shape({
    email: yup.string().email().required(),
    username: yup.string().required(),
    password: yup.string().min(8).required(),
  });

  const form = useForm({
    initialValues: {
      email: "",
      username: "",
      password: "",
    },
    validate: yupResolver(validationSchema),
  });

  const signIn = (email: string, password: string) => {
    authService
      .signIn(email, password)
      .then(() => window.location.replace("/"))
      .catch((e) => toast.error(e.response.data.message));
  };
  const signUp = (email: string, username: string, password: string) => {
    authService
      .signUp(email, username, password)
      .then(() => signIn(email, password))
      .catch((e) => toast.error(e.response.data.message));
  };

  return (
    <Container size={420} my={40}>
      <Title
        align="center"
        sx={(theme) => ({
          fontFamily: `Greycliff CF, ${theme.fontFamily}`,
          fontWeight: 900,
        })}
      >
        Sign up
      </Title>
      {config.get("allowRegistration") && (
        <Text color="dimmed" size="sm" align="center" mt={5}>
          You have an account already?{" "}
          <Anchor component={Link} href={"signIn"} size="sm">
            Sign in
          </Anchor>
        </Text>
      )}
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form
          onSubmit={form.onSubmit((values) =>
            signUp(values.email, values.username, values.password)
          )}
        >
          <TextInput
            label="Username"
            placeholder="john.doe"
            {...form.getInputProps("username")}
          />
          <TextInput
            label="Email"
            placeholder="you@email.com"
            mt="md"
            {...form.getInputProps("email")}
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            mt="md"
            {...form.getInputProps("password")}
          />
          <Button fullWidth mt="xl" type="submit">
            Let's get started
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default SignUpForm;
