package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nanda/nexus/core/domain"
	"github.com/nanda/nexus/core/middleware"
)

type MenuHandler struct {
	menuUsecase domain.MenuUsecase
}

func NewMenuHandler(app fiber.Router, us domain.MenuUsecase) {
	handler := &MenuHandler{menuUsecase: us}

	menus := app.Group("/api/v1/menus")
	menus.Get("/", handler.GetAll)
	menus.Get("/:id", handler.GetByID)

	// Admin only
	menus.Post("/", middleware.JWTProtected(), middleware.RequireRole("admin"), handler.Create)
	menus.Put("/:id", middleware.JWTProtected(), middleware.RequireRole("admin"), handler.Update)
	menus.Delete("/:id", middleware.JWTProtected(), middleware.RequireRole("admin"), handler.Delete)
}

func (h *MenuHandler) GetAll(c *fiber.Ctx) error {
	menus, err := h.menuUsecase.GetAllMenus(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(menus)
}

func (h *MenuHandler) GetByID(c *fiber.Ctx) error {
	menu, err := h.menuUsecase.GetMenu(c.Context(), c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(menu)
}

func (h *MenuHandler) Create(c *fiber.Ctx) error {
	var menu domain.Menu
	if err := c.BodyParser(&menu); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format JSON tidak valid"})
	}
	if err := h.menuUsecase.CreateMenu(c.Context(), &menu); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(menu)
}

func (h *MenuHandler) Update(c *fiber.Ctx) error {
	var menu domain.Menu
	if err := c.BodyParser(&menu); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format JSON tidak valid"})
	}
	menu.ID = c.Params("id")
	if err := h.menuUsecase.UpdateMenu(c.Context(), &menu); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Menu berhasil diperbarui"})
}

func (h *MenuHandler) Delete(c *fiber.Ctx) error {
	if err := h.menuUsecase.DeleteMenu(c.Context(), c.Params("id")); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Menu berhasil dihapus"})
}
